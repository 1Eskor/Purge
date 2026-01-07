// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {OFTUpgradeable} from "@layerzerolabs/oft-evm-upgradeable/contracts/oft/OFTUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract PurgeToken is OFTUpgradeable, UUPSUpgradeable {
    // --- Reflection Engine (Scalable Dividend Algorithm) ---
    uint256 public magnifiedDividendPerShare;
    uint256 constant internal magnitude = 2**128;
    
    mapping(address => int256) public magnifiedDividendCorrections;
    mapping(address => uint256) public withdrawnDividends;
    mapping(address => uint256) public lastActionBlock; // Anti-Flash Loan
    uint256 public totalDividendsDistributed;
    
    // --- Launch Control (Anti-Bot) ---
    bool public tradingOpen;
    mapping(address => bool) public isExcludedFromTrading;

    event DividendsDistributed(address indexed from, uint256 amount);
    event DividendWithdrawn(address indexed to, uint256 amount);
    event GatesOpened();

    modifier whenTradingOpen() {
        require(tradingOpen || isExcludedFromTrading[msg.sender] || msg.sender == owner(), "The Purge has not yet begun.");
        _;
    }

    modifier antiFlashLoan() {
        require(block.number > lastActionBlock[msg.sender], "Anti-Flash: One block cooldown");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _lzEndpoint) OFTUpgradeable(_lzEndpoint) {
        _disableInitializers();
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        address _delegate
    ) public initializer {
        __Ownable_init(_delegate);
        
        __OFT_init(_name, _symbol, _delegate);

        isExcludedFromTrading[_delegate] = true;
        isExcludedFromTrading[address(this)] = true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // Allow a specific controller (PurgeHub) to mint
    function mint(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount);
    }

    /**
     * @notice Global Trading Toggle (Anti-Bot)
     * @dev Once opened, cannot be closed (to ensure trust)
     */
    function openTheGates() external onlyOwner {
        require(!tradingOpen, "The gates are already open");
        tradingOpen = true;
        emit GatesOpened();
    }

    function setExcluded(address _account, bool _excluded) external onlyOwner {
        isExcludedFromTrading[_account] = _excluded;
    }
    
    // --- Dividend Functions ---

    /**
     * @notice Distributes dividends to all current holders
     * @dev The actual tokens must be transferred to this contract address before or during this call.
     *      Typically called by PurgeHub after minting reflection tokens to this contract.
     * @param _amount Amount of tokens distributed
     */
    function distributeDividends(uint256 _amount) external {
        require(totalSupply() > 0, "No Supply");
        if (_amount > 0) {
            magnifiedDividendPerShare += (_amount * magnitude) / totalSupply();
            emit DividendsDistributed(msg.sender, _amount);
            totalDividendsDistributed += _amount;
        }
    }

    /**
     * @notice View the amount of dividend in wei that an address can withdraw.
     * @param _owner The address of a token holder.
     * @return The amount of dividend in wei that `_owner` can withdraw.
     */
    function dividendOf(address _owner) public view returns (uint256) {
        return accumulativeDividendOf(_owner) - withdrawnDividends[_owner];
    }

    /**
     * @notice View the amount of dividend in wei that an address has earned in total.
     */
    function accumulativeDividendOf(address _owner) public view returns (uint256) {
        return uint256(int256(magnifiedDividendPerShare * balanceOf(_owner)) + magnifiedDividendCorrections[_owner]) / magnitude;
    }

    /**
     * @notice Withdraws the caller's distinct dividends.
     */
    function claimReward() public antiFlashLoan {
        uint256 _withdrawable = dividendOf(msg.sender);
        if (_withdrawable > 0) {
            withdrawnDividends[msg.sender] += _withdrawable;
            _update(address(this), msg.sender, _withdrawable); 
            emit DividendWithdrawn(msg.sender, _withdrawable);
        }
    }

    /**
     * @dev Internal update function to handle dividend corrections
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        // Anti-Bot / Launch Control Check
        // Allow Minting (from=0) and Burning (to=0) always
        if (from != address(0) && to != address(0)) {
            if (!tradingOpen) {
                require(
                    isExcludedFromTrading[from] || isExcludedFromTrading[to], 
                    "The Purge has not yet begun."
                );
            }
        }

        super._update(from, to, value);
        
        if (value > 0) {
            // Anti-Flash: Record block number when receiving tokens
            if (to != address(0) && to != address(this)) {
                lastActionBlock[to] = block.number;
            }
            
            // Correction Logic
            int256 correction = int256(value) * int256(magnifiedDividendPerShare);
            
            // When transferring FROM an address, their "correction" increases (less negative or more positive)
            // Effectively removing their entitlement for the tokens allowed.
            if (from != address(0)) {
                magnifiedDividendCorrections[from] += correction;
            }
            
            // When transferring TO an address, their "correction" decreases (more negative)
            // Effectively ignoring the past rewards for these new tokens.
            if (to != address(0)) {
                magnifiedDividendCorrections[to] -= correction;
            }
        }
    }
}
