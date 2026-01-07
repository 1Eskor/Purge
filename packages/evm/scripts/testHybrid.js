const hre = require("hardhat");

async function main() {
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    console.log("Testing Hybrid Reward Model (50/50 Split)...");
    const ETH_EID = 30101;

    // 1. Setup
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
        await hubAsEndpoint.lzReceive(origin, hre.ethers.zeroPadValue("0x01", 32), payload, deployer.address, "0x");
    };

    // --- TEST 1: User 1 Join (Bootstrap) ---
    console.log("\n--- TEST 1: User 1 Join (Bootstrap) ---");
    await purge(user1, "1000");
    let dividends1_start = await purgeToken.dividendOf(user1.address);
    // Claim to clear slate for cleaner diff checking
    await purgeToken.connect(user1).claimReward();

    let supplyCheck = await purgeToken.totalSupply();
    console.log("Supply before Test 2:", hre.ethers.formatEther(supplyCheck));

    // --- TEST 2: User 2 Join (Hybrid Check) ---
    console.log("\n--- TEST 2: User 2 Join (50% Seniority / 50% Global) ---");
    // Ensure 50/50 is default (it is in contract)

    console.log("Sending Purge 2 (1000 ETH worth)...");
    try {
        await purge(user2, "1000");
        console.log("Purge 2 Complete");
    } catch (e) {
        console.error("Purge 2 FAILED:", e);
        // Try to continue logic check just in case, but likely balances didn't update
    }

    let dividends1 = await purgeToken.dividendOf(user1.address);
    let dividends2 = await purgeToken.dividendOf(user2.address);

    console.log("User 1 Dividends (Seniority + Part Global):", hre.ethers.formatEther(dividends1));
    console.log("User 2 Dividends (Part Global Only):", hre.ethers.formatEther(dividends2));

    if (dividends2 > 0n) {
        console.log("✅ Global Tier Verified: User 2 received rewards immediately.");
    } else {
        console.log("❌ Global Tier Failed: User 2 got 0.");
    }

    if (dividends1 > dividends2) {
        console.log("✅ Seniority Tier Verified: User 1 received significantly more.");
    }

    // --- TEST 3: Switch to 100% Seniority (Sequential) ---
    console.log("\n--- TEST 3: Switch to 100% Seniority ---");
    await purgeHub.setHybridRatios(10000, 0); // 100% Seniority

    // Clear dividends
    await purgeToken.connect(user1).claimReward();
    await purgeToken.connect(user2).claimReward();

    const user3Addr = "0x0000000000000000000000000000000000009999";
    const payloadUser3 = hre.ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [user3Addr, hre.ethers.parseEther("1000")]);
    const origin = [ETH_EID, peer, 2];
    await hubAsEndpoint.lzReceive(origin, hre.ethers.zeroPadValue("0x03", 32), payloadUser3, deployer.address, "0x");

    let dividends3 = await purgeToken.dividendOf(user3Addr);
    console.log("User 3 Dividends (Should be 0):", hre.ethers.formatEther(dividends3));

    if (dividends3 == 0n) {
        console.log("✅ 100% Seniority Verified: New user got 0.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
