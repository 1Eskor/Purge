// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PRGToken.sol";
import "../src/PurgeHub.sol";

/**
 * @title DeployPurge
 * @notice Deployment script for PRG Token and PurgeHub contracts
 */
contract DeployPurge is Script {
    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy PRG Token
        PRGToken prgToken = new PRGToken();
        console.log("PRGToken deployed at:", address(prgToken));
        
        // 2. Deploy PurgeHub with treasury as deployer for now
        PurgeHub purgeHub = new PurgeHub(address(prgToken), deployer);
        console.log("PurgeHub deployed at:", address(purgeHub));
        
        // 3. Set PurgeHub as the minter for PRG Token
        prgToken.setPurgeHub(address(purgeHub));
        console.log("PurgeHub set as PRG minter");
        
        // 4. Authorize deployer as relayer for testing
        purgeHub.setRelayer(deployer, true);
        console.log("Deployer authorized as relayer for testing");
        
        // 5. Set trusted peer for Solana (placeholder - update with actual program ID)
        // Solana Purge Program ID: EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re
        // Convert to bytes32 (left-padded)
        bytes32 solanaProgramId = bytes32(hex"00000000000000000000000000000000c5f4e9f3d4b8a7c6e5d4c3b2a1908070"); // Placeholder
        purgeHub.setTrustedPeer(40168, solanaProgramId); // 40168 = Solana Devnet EID
        console.log("Solana peer trusted");
        
        vm.stopBroadcast();
        
        // Log summary
        console.log("");
        console.log("=== Deployment Summary ===");
        console.log("PRGToken:", address(prgToken));
        console.log("PurgeHub:", address(purgeHub));
        console.log("Treasury:", deployer);
        console.log("========================");
    }
}
