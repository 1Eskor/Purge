pragma solidity ^0.8.20;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {LogExpMath} from "./LogExpMath.sol";

/**
 * @title BancorFormula
 * @dev Implements the Bancor Bonding Curve formula:
 *      Return = Supply * ((1 + Deposit/Reserve) ^(Ratio) - 1)
 *      
 *      Optimized for specific Reserve Ratios:
 *      - 500,000 PPM (50%) -> Square Root
 *      - 200,000 PPM (20%) -> 5th Root (Not implemented in MVP, default to Linear fallback or revert)
 *      
 *      For MVP, we support 50% (Linear Price) and 100% (Constant Price).
 */
library BancorFormula {
    using Math for uint256;
    
    uint256 private constant MAX_RATIO = 1000000;

    /**
     * @notice Calculate value of buying tokens
     * @param supply Current token supply
     * @param reserveBalance Current reserve balance (POL)
     * @param reserveRatio Reserve ratio in PPM (1-1000000)
     * @param depositAmount Amount of reserve token deposited
     * @return amount Amount of tokens to mint
     */
    function calculatePurchaseReturn(
        uint256 supply,
        uint256 reserveBalance,
        uint32 reserveRatio,
        uint256 depositAmount
    ) internal pure returns (uint256 amount) {
        // Special Case: Initialization
        if (supply == 0 || reserveBalance == 0) {
            // If supply is 0, we can't use the formula.
            // Return amount based on initial price ($0.01 or similar logic handled in Hub).
            // But Hub calls this. Hub should handle initialization logic.
            // Return 0 here to indicate fallback needed? 
            // Or return linear calc assuming price=1?
            return depositAmount; 
        }

        // Formula: Supply * ((1 + Deposit/Reserve) ^ Ratio - 1)

        // 1. Calculate Base = (Reserve + Deposit) / Reserve
        // Precision: 1e18
        uint256 baseN = reserveBalance + depositAmount;
        uint256 baseD = reserveBalance;
        
        if (supply == 0 || reserveBalance == 0) {
            return depositAmount;
        }
        
        // 2. Exponentiation
        
        // Optimization for 100% Ratio (Linear Price? No, Constant Price P=R/S)
        if (reserveRatio == 1000000) {
             amount = (supply * depositAmount) / reserveBalance;
             return amount;
        }
        
        // General Case: Supply * ((1 + d/r) ^ ratio - 1)
        // using LogExpMath
        
        // Base = (R + D) / R
        // Precision 1e18
        uint256 base = ((reserveBalance + depositAmount) * 1e18) / reserveBalance;
        
        // Exponent = Ratio / 1M.
        // Ratio is PPM. We need 1e18 precision for pow function.
        // ex: 500000 -> 0.5 * 1e18
        uint256 exponent = (uint256(reserveRatio) * 1e18) / 1000000;
        
        // Result = base ^ exponent
        uint256 result = LogExpMath.pow(base, exponent);
        
        // Output: Supply * (result - 1)
        // result is 1e18 precision
        if (result <= 1e18) return 0; // Should not happen if deposit > 0
        
        amount = (supply * (result - 1e18)) / 1e18;
        return amount;
    }
}
