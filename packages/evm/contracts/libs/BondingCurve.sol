// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title BondingCurve
 * @dev Library for calculating bonding curve prices and mint amounts.
 *      Implements a Linear Bonding Curve: Price = m * Supply + b
 */
library BondingCurve {
    using Math for uint256;

    /**
     * @notice Calculate the amount of tokens to mint for a given payment amount
     * @dev Uses quadratic formula to solve for k (tokens to mint):
     *      k = (-(mS + b) + sqrt((mS + b)^2 + 2 * m * paymentAmount)) / m
     * @param paymentAmount The amount of asset (USDC) being paid
     * @param currentSupply The current supply of the token (S)
     * @param m The slope of the curve (scaled by 1e18 for precision)
     * @param b The initial price of the curve (scaled by 1e18 for precision)
     * @return mintAmount The amount of tokens to mint
     */
    function getMintAmount(
        uint256 paymentAmount,
        uint256 currentSupply,
        uint256 m,
        uint256 b
    ) internal pure returns (uint256 mintAmount) {
        if (m == 0) {
            // Constant price: k = Cost / b
            return (paymentAmount * 1e18) / b;
        }

        // Current Price P = mS + b
        // Note: m and b are scaled by 1e18, but Supply is in 1e18 units too.
        // We need to be careful with units.
        // Let's assume:
        // - paymentAmount (Cost) is in 1e18 (standard ERC20 decimals, or adjusted to it)
        // - currentSupply (S) is in 1e18
        // - m is in 1e18 (slope per 1e18 supply)
        // - b is in 1e18 (base price)

        // However, standard bonding curve math usually treats Supply as "units".
        // If Supply is 100 * 1e18, does m=1 mean price increases by 1 for every 1e18 tokens?
        // Yes, likely meaningful.
        
        // Let's normalize to WEI for precision.
        // Equation: k = (-(mS/1e18 + b) + sqrt((mS/1e18 + b)^2 + 2 * (m/1e18) * Cost)) / (m/1e18)
        
        // Optimized for solidity with precision:
        // A = m/2
        // B = m*S + b (Current Spot Price)
        // C = -paymentAmount
        
        // Since m, b, S are all potentially large, we need to handle scaling.
        // Let's define:
        // m: Price increase per WHOLE token (1e18 units).
        // b: Starting price per WHOLE token.
        // Supply: in 1e18 units.
        
        // Spot Price = (m * Supply / 1e18) + b
        uint256 currentPrice = (m * currentSupply) / 1e18 + b;
        
        // Term inside sqrt: (mS + b)^2 + 2 * m * Cost
        // Careful: 2 * m * Cost might overflow if not handled.
        
        uint256 term1 = currentPrice * currentPrice; // (P0)^2
        uint256 term2 = (2 * m * paymentAmount) / 1e18; // 2 * m * Cost (adjusted for m scaling)
        
        uint256 sqrtTerm = (term1 + term2).sqrt();
        
        // k = (sqrtTerm - currentPrice) * 1e18 / m
        // Using conjugate form for better precision with small numbers:
        // k = (2 * Cost * 1e18) / (sqrtTerm + currentPrice)
        // This avoids (sqrtTerm - currentPrice) resulting in 0 due to precision loss.
        
        mintAmount = (2 * paymentAmount * 1e18) / (sqrtTerm + currentPrice);
    }

    /**
     * @notice Calculate the cost to mint a specific amount of tokens
     * @dev Integral of (mx + b) dx from S to S+k
     *      Cost = m/2 * k^2 + (mS + b) * k
     * @return costAmount The cost in asset (USDC)
     */
    function getMintCost(
        uint256 mintAmount,
        uint256 currentSupply,
        uint256 m,
        uint256 b
    ) internal pure returns (uint256 costAmount) {
        // term1 = m/2 * k^2
        // We divide by 1e36 because k^2 is 1e36, m is 1e18. Result should be 1e18.
        uint256 k = mintAmount;
        uint256 term1 = (m * k * k) / (2 * 1e36); 
        
        // term2 = (mS + b) * k
        // (m*S/1e18 + b) * k / 1e18
        uint256 currentPrice = (m * currentSupply) / 1e18 + b;
        uint256 term2 = (currentPrice * k) / 1e18;
        
        costAmount = term1 + term2;
    }
}
