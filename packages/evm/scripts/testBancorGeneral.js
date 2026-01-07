const hre = require("hardhat");

async function main() {
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    console.log("Testing General Power Math (33% Ratio)...");
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

    // 33% Ratio (333333 PPM) -> x^0.333333
    const reserveRatio33 = 333333;
    const initialReserve = 0;

    const PurgeHub = await hre.ethers.getContractFactory("PurgeHub");
    const purgeHub = await PurgeHub.deploy(
        endpointAddr,
        deployer.address,
        await purgeToken.getAddress(),
        deployer.address,
        deployer.address,
        reserveRatio33,
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

    // --- TEST: 33% Ratio ---

    // Purge 1: Baseline (1000)
    await purge(user1, "1000");
    let supply = await purgeToken.totalSupply();
    console.log("Supply 1 (Baseline):", hre.ethers.formatEther(supply)); // 1000

    // Purge 2: General Power Function Check
    // Adding 1000 to 1000 reserve. Doubles reserve.
    // S_new = S_old * (2^0.333333) 
    // 2^(1/3) = 1.2599
    // Growth = 0.2599 * 1000 ~ 260 tokens.

    await purge(user2, "1000");
    let supply2 = await purgeToken.totalSupply();
    let minted2 = parseFloat(hre.ethers.formatEther(supply2)) - parseFloat(hre.ethers.formatEther(supply));
    console.log("Tokens Minted (33%):", minted2);

    if (minted2 > 250 && minted2 < 270) {
        console.log("✅ 33% Curve Verified: Minted ~260 tokens (2^0.33 growth).");
    } else {
        console.log(`❌ 33% Curve Failed: Expected ~260, got ${minted2}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
