const hre = require("hardhat");

async function main() {
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    console.log("Testing Reflection Engine (Sequential Rewards)...");
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
    // Tax 3%. 1000 input.
    // Refund logic: User 1 gets own tax?
    await purge(user1, "1000");

    let dividends1 = await purgeToken.dividendOf(user1.address);
    console.log("User 1 Dividends (Should be > 0 due to self-refund):", hre.ethers.formatEther(dividends1));
    // Verify
    if (dividends1 > 0n) {
        console.log("✅ Bootstrap Logic Verified: First user got own tax.");
    }

    // --- TEST 2: User 2 Join (Sequential) ---
    console.log("\n--- TEST 2: User 2 Join (Sequential Check) ---");
    // User 1 holds tokens.
    // User 2 joins.
    // User 2's tax should go to User 1.
    // User 2 should get 0 dividends (excluded from own tax).

    await purge(user2, "1000");

    let dividends1_updated = await purgeToken.dividendOf(user1.address);
    let dividends2 = await purgeToken.dividendOf(user2.address);

    console.log("User 1 Dividends (Updated):", hre.ethers.formatEther(dividends1_updated));
    console.log("User 2 Dividends (Should be 0):", hre.ethers.formatEther(dividends2));

    if (dividends1_updated > dividends1) {
        console.log("✅ Rewards Verified: User 1 earned from User 2.");
    }

    if (parseFloat(hre.ethers.formatEther(dividends2)) === 0) {
        console.log("✅ Sequential Logic Verified: User 2 earned NOTHING from own entry.");
    } else {
        console.log("❌ Sequential Logic Failed: User 2 got rewards.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
