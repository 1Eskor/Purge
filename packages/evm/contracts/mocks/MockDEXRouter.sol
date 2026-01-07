// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockDEXRouter
 * @dev Simulates a DEX aggregator (like 1inch) for local testing.
 *      Performs a simple 1:1 swap from any token to USDC.
 */
contract MockDEXRouter {
    address public usdc;
    
    // Simulated exchange rate (in basis points, 10000 = 1:1)
    uint256 public exchangeRateBps = 10000;
    
    event MockSwapExecuted(
        address indexed srcToken,
        address indexed dstToken,
        uint256 srcAmount,
        uint256 dstAmount
    );

    constructor(address _usdc) {
        usdc = _usdc;
    }

    /**
     * @notice Set the simulated exchange rate
     * @param _rateBps Rate in BPS (10000 = 1:1, 5000 = 0.5:1)
     */
    function setExchangeRate(uint256 _rateBps) external {
        exchangeRateBps = _rateBps;
    }

    /**
     * @notice Simulates a swap from srcToken to USDC
     * @dev The caller must have approved this contract to spend srcToken
     * @param _srcToken The token being sold
     * @param _amount Amount of srcToken to swap
     * @return usdcOut Amount of USDC received
     */
    function swap(address _srcToken, uint256 _amount) external returns (uint256 usdcOut) {
        // Take the source token from caller
        IERC20(_srcToken).transferFrom(msg.sender, address(this), _amount);
        
        // Calculate USDC output based on exchange rate
        usdcOut = _amount * exchangeRateBps / 10000;
        
        // Send USDC to caller
        IERC20(usdc).transfer(msg.sender, usdcOut);
        
        emit MockSwapExecuted(_srcToken, usdc, _amount, usdcOut);
        return usdcOut;
    }

    /**
     * @notice Encode calldata for calling swap()
     * @dev Helper for generating swapData in tests
     */
    function encodeSwapData(address _srcToken, uint256 _amount) external pure returns (bytes memory) {
        return abi.encodeWithSelector(this.swap.selector, _srcToken, _amount);
    }

    /**
     * @notice Fallback to handle raw calldata (like real 1inch router)
     * @dev Decodes and executes swap if calldata matches swap() signature
     */
    fallback() external {
        // Decode the first 4 bytes as function selector
        bytes4 selector;
        assembly {
            selector := calldataload(0)
        }
        
        if (selector == this.swap.selector) {
            // Decode parameters
            (address srcToken, uint256 amount) = abi.decode(msg.data[4:], (address, uint256));
            
            // Execute swap - note: caller (PurgeSpoke) has approved us
            IERC20(srcToken).transferFrom(msg.sender, address(this), amount);
            uint256 usdcOut = amount * exchangeRateBps / 10000;
            
            // Transfer USDC to caller
            bool success = IERC20(usdc).transfer(msg.sender, usdcOut);
            require(success, "USDC transfer failed");
            
            emit MockSwapExecuted(srcToken, usdc, amount, usdcOut);
        } else {
            revert("Unknown function");
        }
    }

    receive() external payable {}
}

/**
 * @title MockUSDC
 * @dev Simple ERC20 for testing USDC (uses 18 decimals for simplicity)
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1_000_000_000 * 10**18); // 1B USDC
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    // Using 18 decimals for test simplicity (real USDC uses 6)
}

/**
 * @title MockVictimToken
 * @dev Simple ERC20 representing a "victim" token to purge
 */
contract MockVictimToken is ERC20 {
    constructor() ERC20("Victim Token", "VICTIM") {
        _mint(msg.sender, 1_000_000_000 * 10**18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
