// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAggregator {
    address public immutable usdc;

    constructor(address _usdc) {
        usdc = _usdc;
    }

    struct SwapDescription {
        address srcToken;
        address dstToken;
        address srcReceiver;
        address dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
    }

    // Matches the interface in PurgeSpoke
    function swap(
        address executor,
        SwapDescription calldata desc,
        bytes calldata permit,
        bytes calldata data
    ) external payable returns (uint256 returnAmount, uint256 spentAmount) {
        // In a real swap, we'd take the srcToken and send dstToken (USDC).
        // Since this is a mock, we assume THIS contract is funded with USDC
        // or mints it if it's a mock token.
        
        // 1. Take srcToken from executor (Spoke)
        IERC20(desc.srcToken).transferFrom(msg.sender, address(this), desc.amount);

        // 2. Determine output amount (simplified: 1:1 value for demo)
        returnAmount = desc.amount; // 1 token = 1 USDC unit (simplified)
        spentAmount = desc.amount;

        // 3. Send dstToken (USDC) to dstReceiver
        IERC20(desc.dstToken).transfer(desc.dstReceiver, returnAmount);

        return (returnAmount, spentAmount);
    }
}
