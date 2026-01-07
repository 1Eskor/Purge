const hre = require("hardhat");

async function main() {
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    console.log("Testing Configurable Bancor Logic...");
    const ETH_EID = 30101;

    // 1. Setup Contracts
    console.log("INT: Deploying fresh contracts...");
    const MockEndpoint = await hre.ethers.getContractFactory("MockEndpointV2");
    const mockEndpoint = await MockEndpoint.deploy();
    await mockEndpoint.waitForDeployment();
    const endpointAddr = await mockEndpoint.getAddress();

    const PurgeToken = await hre.ethers.getContractFactory("PurgeToken");
    const purgeToken = await PurgeToken.deploy("Purge", "PRG", endpointAddr, deployer.address);
    await purgeToken.waitForDeployment();

    // Default 20%
    const reserveRatio20 = 200000;
    const initialReserve = 0;

    const PurgeHub = await hre.ethers.getContractFactory("PurgeHub");
    const purgeHub = await PurgeHub.deploy(
        endpointAddr,
        deployer.address,
        await purgeToken.getAddress(),
        deployer.address,
        deployer.address,
        reserveRatio20,
        initialReserve
    );
    await purgeHub.waitForDeployment();

    await purgeToken.transferOwnership(await purgeHub.getAddress());
    await purgeHub.setSpokeStatus(ETH_EID, true);
    const peer = hre.ethers.zeroPadValue(deployer.address, 32);
    await purgeHub.setPeer(ETH_EID, peer);

    // Setup Impersonation
    await hre.network.provider.request({ method: "hardhat_impersonateAccount", params: [endpointAddr] });
    await hre.network.provider.send("hardhat_setBalance", [endpointAddr, "0xDE0B6B3A7640000"]);
    const endpointSigner = await hre.ethers.getSigner(endpointAddr);
    const hubAsEndpoint = purgeHub.connect(endpointSigner);

    // Helper
    const purge = async (user, amountEther) => {
        const amt = hre.ethers.parseEther(amountEther);
        const payload = hre.ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [user.address, amt]);
        const origin = [ETH_EID, peer, 1];
        // Note: Nonce doesn't matter for mock
        await hubAsEndpoint.lzReceive(origin, hre.ethers.zeroPadValue("0x01", 32), payload, deployer.address, "0x");
    };

    // --- TEST 1: 20% Ratio (Steep) ---
    console.log("\n--- TEST 1: 20% Curve (Steep) ---");

    // Purge 1: Baseline (1000)
    await purge(user1, "1000");
    let supply = await purgeToken.totalSupply();
    console.log("Supply 1 (Baseline):", hre.ethers.formatEther(supply)); // Should be 1000

    // Purge 2: Steep Check
    // Adding 1000 to 1000 reserve. Doubles reserve.
    // S_new = S_old * (2^0.2) = S_old * 1.148
    // Minted should be ~148
    await purge(user2, "1000");
    let supply2 = await purgeToken.totalSupply();
    let minted2 = parseFloat(hre.ethers.formatEther(supply2)) - parseFloat(hre.ethers.formatEther(supply));
    console.log("Tokens Minted (20%):", minted2);

    if (minted2 < 160 && minted2 > 140) {
        console.log("✅ 20% Curve Verified: High Price Impact (Minted ~148 vs 1000).");
    } else {
        console.log(`❌ 20% Curve Failed: Expected ~148, got ${minted2}`);
    }

    // --- TEST 2: Switch to 50% ---
    console.log("\n--- TEST 2: Switch to 50% (Moderate) ---");
    await purgeHub.setReserveRatio(500000);

    // Purge 3: Flattened Check
    // Current Reserve: 2000. Supply: ~1148.
    // Add 1000. Reserve -> 3000.
    // Ratio: 1.5. (3000/2000).
    // Formula: S_new = S_old * (1.5^0.5) = S_old * 1.2247
    // Growth = 0.2247 * 1148 ~ 258 tokens.

    await purge(user1, "1000");
    let supply3 = await purgeToken.totalSupply();
    let minted3 = parseFloat(hre.ethers.formatEther(supply3)) - parseFloat(hre.ethers.formatEther(supply2));
    console.log("Tokens Minted (50%):", minted3);

    if (minted3 > 240 && minted3 < 270) {
        console.log("✅ 50% Switch Verified: Curve Flattened (Minted ~258).");
    } else {
        console.log(`❌ 50% Switch Failed: Expected ~258, got ${minted3}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
