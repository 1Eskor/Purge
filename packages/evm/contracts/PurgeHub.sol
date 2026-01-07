// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OAppReceiverUpgradeable, Origin} from "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/OAppReceiverUpgradeable.sol";
import {OAppCoreUpgradeable} from "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/OAppCoreUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PurgeToken} from "./PurgeToken.sol";
import {BancorFormula} from "./libs/BancorFormula.sol";

/**
 * @title PurgeHub
 * @dev The Hub contract deployed on Base. Receives cross-chain messages from Spokes
 *      and mints $PRG tokens with tax distribution.
 * @notice This contract inherits OAppReceiver to receive LayerZero messages.
 */
contract PurgeHub is OAppReceiverUpgradeable, UUPSUpgradeable {
    PurgeToken public purgeToken;
    address public treasury; // The War Chest
    address public lpWallet; // Liquidity Floor
    
    // Bancor Bonding Curve State
    uint256 public reserveBalance;   // Total USDC backing (Virtual or Real if holding assets)
    uint32 public reserveRatio;      // PPM (e.g. 500000 = 50%)
    
    // Tax Allocations (Total 10% = 1000 BPS) -> NOW 6% (600 BPS)
    // Non-Minting Taxes (Adds to Reserve WITHOUT minting tokens -> Raises Floor)
    uint256 public taxBpLP = 300;        // 3.0%
    uint256 public taxBpTreasury = 100;  // 1.0%
    uint256 public taxBpBurn = 50;       // 0.5%
    
    // Minting Taxes (Mints tokens for distribution)
    uint256 public taxBpReflect = 150;   // 1.5%
    
    // Hybrid Reward Ratios (Total 10000 BPS = 100%)
    uint256 public ratioSeniority = 5000; // 50% Seniority (Pre-Mint)
    uint256 public ratioGlobal = 5000;    // 50% Global (Post-Mint)
    
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Dead address for burns
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    mapping(uint32 => bool) public allowedSpokeEids;

    event SpokeAuthorized(uint32 indexed srcEid, bool allowed);
    event PurgeProcessed(address indexed user, uint32 indexed srcEid, uint256 totalAmount, uint256 userAmount);
    event TaxDistributed(uint256 lp, uint256 reflect, uint256 treasury, uint256 burn);
    event WalletsUpdated(address indexed lp, address indexed treasury);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _lzEndpoint) OAppCoreUpgradeable(_lzEndpoint) {
        _disableInitializers();
    }

    function initialize(
        address _delegate,
        address _purgeToken, 
        address _treasury, 
        address _lpWallet,
        uint32 _reserveRatio,
        uint256 _initialReserve
    ) public initializer {
        __Ownable_init(_delegate);
        __UUPSUpgradeable_init();
        __OAppReceiver_init(_delegate);

        purgeToken = PurgeToken(_purgeToken);
        treasury = _treasury;
        lpWallet = _lpWallet;
        reserveRatio = _reserveRatio; // e.g. 500000
        reserveBalance = _initialReserve; 
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @notice Authorize a spoke chain endpoint ID
     */
    function setSpokeStatus(uint32 _srcEid, bool _allowed) external onlyOwner {
        allowedSpokeEids[_srcEid] = _allowed;
        emit SpokeAuthorized(_srcEid, _allowed);
    }

    /**
     * @notice Update treasury and LP wallet addresses
     */
    function setWallets(address _lpWallet, address _treasury) external onlyOwner {
        require(_lpWallet != address(0) && _treasury != address(0), "Invalid address");
        lpWallet = _lpWallet;
        treasury = _treasury;
        emit WalletsUpdated(_lpWallet, _treasury);
    }

    /**
     * @dev Internal function called by LayerZero when a message arrives
     * @param _origin The origin information (srcEid, sender, nonce)
     * @param _guid The unique message identifier
     * @param _message The encoded message payload
     */
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Verify the source chain is an allowed spoke
        require(allowedSpokeEids[_origin.srcEid], "Unauthorized spoke");

        // Decode the message: (user address, USD value to mint)
        (address user, uint256 usdcAmount) = abi.decode(_message, (address, uint256));

        // Process the purge with tax distribution
        _processPurge(user, usdcAmount, _origin.srcEid);
    }

    /**
     * @dev Internal function to mint tokens with tax distribution
     */
    function _processPurge(address _user, uint256 _amount, uint32 _srcEid) internal {
        // _amount is the USD value being purged (normalized to 1e18)
        
        // 1. Add Full Amount to Reserve
        reserveBalance += _amount;
        
        // 2. Calculate Total Tokens to Mint (Bancor Logic)
        // Based on adding '_amount' to the PREVIOUS reserve (which was reserveBalance - _amount)
        // Check supply to handle initialization
        uint256 currentSupply = purgeToken.totalSupply();
        uint256 previousReserve = reserveBalance - _amount;
        
        // If it's the first mint, previousReserve might be 0. 
        // BancorFormula (in calculatePurchaseReturn) uses current Reserve?
        // Let's pass the 'Reserve before deposit' to match standard 'deposit' logic?
        // BancorFormula.calculatePurchaseReturn(supply, reserve, ratio, amount) assumes reserve is the amount BEFORE.
        // So we pass 'previousReserve'.
        
        uint256 totalTokensToMint = BancorFormula.calculatePurchaseReturn(
            currentSupply, 
            previousReserve,
            reserveRatio, 
            _amount
        );
        
        // 3. Distribute Tokens
        // Calculate shares
        uint256 lpTokens = (totalTokensToMint * taxBpLP) / BPS_DENOMINATOR;
        uint256 reflectTokens = (totalTokensToMint * taxBpReflect) / BPS_DENOMINATOR;
        uint256 treasuryTokens = (totalTokensToMint * taxBpTreasury) / BPS_DENOMINATOR;
        uint256 burnTokens = (totalTokensToMint * taxBpBurn) / BPS_DENOMINATOR;
        
        uint256 totalTaxTokens = lpTokens + reflectTokens + treasuryTokens + burnTokens;
        uint256 userTokens = totalTokensToMint - totalTaxTokens;

        // --- Hybrid Logic ---
        
        // Split reflections based on Governance Ratio
        uint256 reflectSeniority = (reflectTokens * ratioSeniority) / BPS_DENOMINATOR;
        uint256 reflectGlobal = reflectTokens - reflectSeniority; // Remainder ensures no dust loss

        if (currentSupply > 0) {
            // 1. Seniority Reward (Pre-Mint): Only existing holders get this.
            if (reflectSeniority > 0) {
                purgeToken.mint(address(purgeToken), reflectSeniority);
                purgeToken.distributeDividends(reflectSeniority);
            }
            
            // 2. Mint User (New Entry)
            purgeToken.mint(_user, userTokens);
            
            // 3. Global Reward (Post-Mint): Including new user.
            if (reflectGlobal > 0) {
                purgeToken.mint(address(purgeToken), reflectGlobal);
                purgeToken.distributeDividends(reflectGlobal);
            }
        } else {
            // Bootstrap Case (Supply 0)
            // Mint User FIRST, then User gets everything (User is the Senior & Global)
            purgeToken.mint(_user, userTokens);
            
            if (reflectTokens > 0) {
                purgeToken.mint(address(purgeToken), reflectTokens);
                purgeToken.distributeDividends(reflectTokens);
            }
        }
        
        if (lpWallet != address(0)) purgeToken.mint(lpWallet, lpTokens);
        if (treasury != address(0)) purgeToken.mint(treasury, treasuryTokens);
        purgeToken.mint(DEAD_ADDRESS, burnTokens);

        emit PurgeProcessed(_user, _srcEid, _amount, userTokens);
        emit TaxDistributed(lpTokens, reflectTokens, treasuryTokens, burnTokens);
    }

    // --- Admin Functions ---

    /**
     * @notice Updates the Tax Allocations
     * @param _lp new LP BPS
     * @param _treasury new Treasury BPS
     * @param _burn new Burn BPS
     * @param _reflect new Reflect BPS
     */
    function setTaxAllocations(uint256 _lp, uint256 _treasury, uint256 _burn, uint256 _reflect) external onlyOwner {
        require(_lp + _treasury + _burn + _reflect <= BPS_DENOMINATOR, "Total tax cannot exceed 100%");
        
        taxBpLP = _lp;
        taxBpTreasury = _treasury;
        taxBpBurn = _burn;
        taxBpReflect = _reflect;
    }

    /**
     * @notice Updates Hybrid Reward Ratios
     * @param _seniority BPS for Seniority Tier (Pre-Mint)
     * @param _global BPS for Global Tier (Post-Mint)
     */
    function setHybridRatios(uint256 _seniority, uint256 _global) external onlyOwner {
        require(_seniority + _global == BPS_DENOMINATOR, "Must equal 100%");
        ratioSeniority = _seniority;
        ratioGlobal = _global;
    }

    /**
     * @notice Updates the Bancor Reserve Ratio
     * @param _newRatio New ratio in PPM (e.g. 200000 = 20%, 500000 = 50%)
     */
    function setReserveRatio(uint32 _newRatio) external onlyOwner {
        reserveRatio = _newRatio;
        // Consider emitting an event here
    }

    /**
     * @notice Withdraw accumulated reflections for distribution
     * @dev Called by owner/DAO to distribute reflections
     */
    function withdrawReflections(address _to, uint256 _amount) external onlyOwner {
        require(_amount <= purgeToken.balanceOf(address(this)), "Insufficient balance");
        purgeToken.transfer(_to, _amount);
    }

    /**
     * @notice Required override for OAppReceiver
     */
    function oAppVersion() public pure override returns (uint64 senderVersion, uint64 receiverVersion) {
        return (0, 2); // Receive-only OApp
    }

    /**
     * @notice Global Trading Toggle (Pass-through)
     * @dev Allows the Hub owner to open trading on the underlying PurgeToken
     */
    function openTheGates() external onlyOwner {
        purgeToken.openTheGates();
    }

    /**
     * @notice Seeds the bonding curve to avoid Division by Zero on first mint
     * @dev Mints initial supply and sets virtual reserve
     */
    function seedInitialization(uint256 _initialSupply, uint256 _virtualReserve) external onlyOwner {
        require(purgeToken.totalSupply() == 0, "Already initialized");
        require(_initialSupply > 0 && _virtualReserve > 0, "Must be > 0");
        
        reserveBalance = _virtualReserve;
        // Mint initial supply to the Treasury/LP to establish the baseline
        purgeToken.mint(treasury, _initialSupply);
    }

    /**
     * @notice Custom entry point for the Relayer Bot
     * @dev Called by the Relayer (Owner) to settle cross-chain purges from Solana
     */
    function receivePurge(
        uint32 _srcEid, 
        bytes32 /*_srcAddress*/, 
        address _recipient, 
        uint256 _amount, 
        uint64 /*_nonce*/
    ) external onlyOwner {
        // Authenticate trusted spoke?
        require(allowedSpokeEids[_srcEid], "Unaothorized spoke");
        
        // Process Purge using internal logic
        _processPurge(_recipient, _amount, _srcEid);
    }
}
