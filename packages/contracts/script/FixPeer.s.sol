// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PurgeHub.sol";

contract FixPeer is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Configuration
        address purgeHubAddr = 0x16F97AAB49Ec1969FF520DdDa64f2E3870856A0f;
        
        // Correct Solana Program ID (32 bytes)
        // EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re -> Hex
        bytes32 solanaProgramId = bytes32(uint256(0xc3b9ee28aaeea05cc3b11771eeb2e148714eaef786705128db5c583612359da));
        
        vm.startBroadcast(deployerPrivateKey);
        
        PurgeHub(purgeHubAddr).setTrustedPeer(40168, solanaProgramId);
        console.log("Updated Trusted Peer for 40168 to:", vm.toString(solanaProgramId));
        
        vm.stopBroadcast();
    }
}
