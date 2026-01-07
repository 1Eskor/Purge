// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PurgeHubLZ.sol";
import "../src/PurgeHub.sol";

contract DeployLZ is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Configuration
        address purgeHubAddr = 0x16F97AAB49Ec1969FF520DdDa64f2E3870856A0f;
        address lzEndpoint = 0x6EDCE65403992e310A62460808c4b910D972f10f;
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy PurgeHubLZ
        PurgeHubLZ purgeHubLZ = new PurgeHubLZ(lzEndpoint, deployer, purgeHubAddr);
        console.log("PurgeHubLZ deployed at:", address(purgeHubLZ));
        
        // 2. Authorize PurgeHubLZ as relayer on PurgeHub
        PurgeHub(purgeHubAddr).setRelayer(address(purgeHubLZ), true);
        console.log("PurgeHubLZ authorized as relayer");
        
        // 3. Set peer for Solana (Placeholder bytes32 program ID)
        // Solana EID: 40168
        // Program ID: EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re
        // 0xc5f4e9f3d4b8a7c6e5d4c3b2a1908070... in hex bytes32
        bytes32 solanaProgramId = bytes32(hex"00000000000000000000000000000000c5f4e9f3d4b8a7c6e5d4c3b2a1908070");
        purgeHubLZ.setPeer(40168, solanaProgramId);
        console.log("Set peer for Solana EID 40168");
        
        vm.stopBroadcast();
    }
}
