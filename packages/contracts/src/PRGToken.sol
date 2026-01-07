// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PRG Token
 * @notice The Purge Protocol governance/reward token
 * @dev Minted when users deposit tokens through the Purge protocol
 */
contract PRGToken is ERC20, ERC20Burnable, Ownable {
    // The PurgeHub contract that's allowed to mint tokens
    address public purgeHub;
    
    // Events
    event PurgeHubUpdated(address indexed oldHub, address indexed newHub);
    
    constructor() ERC20("Purge Token", "PRG") Ownable(msg.sender) {
        // Initial supply: 0 - tokens are minted on purge
    }
    
    /**
     * @notice Set the PurgeHub contract address
     * @param _purgeHub The address of the PurgeHub contract
     */
    function setPurgeHub(address _purgeHub) external onlyOwner {
        address oldHub = purgeHub;
        purgeHub = _purgeHub;
        emit PurgeHubUpdated(oldHub, _purgeHub);
    }
    
    /**
     * @notice Mint PRG tokens - only callable by PurgeHub
     * @param to The recipient address
     * @param amount The amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(msg.sender == purgeHub, "PRG: Only PurgeHub can mint");
        _mint(to, amount);
    }
    
    /**
     * @notice Get token decimals (18 like standard ERC20)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
