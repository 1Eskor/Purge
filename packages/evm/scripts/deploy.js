const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const treasury = deployer.address;
    const lpWallet = deployer.address;

    // LayerZero Endpoint IDs
    const BASE_EID = 30184;      // Base Mainnet
    const ETH_EID = 30101;       // Ethereum Mainnet
    const SOLANA_EID = 30168;    // Solana Mainnet

    // 1. Deploy Mock LZ Endpoint (for local testing)
    console.log("\n1. Deploying MockEndpointV2...");
    const MockEndpoint = await hre.ethers.getContractFactory("MockEndpointV2");
    const mockEndpoint = await MockEndpoint.deploy();
    await mockEndpoint.waitForDeployment();
    const endpointAddress = await mockEndpoint.getAddress();
    console.log(`   MockEndpointV2 deployed to: ${endpointAddress}`);

    // 2. Deploy PurgeToken (the OFT)
    console.log("\n2. Deploying PurgeToken...");
    const PurgeToken = await hre.ethers.getContractFactory("PurgeToken");
    const purgeToken = await PurgeToken.deploy(
        "Purge",
        "PRG",
        endpointAddress,
        deployer.address
    );
    await purgeToken.waitForDeployment();
    const tokenAddress = await purgeToken.getAddress();
    console.log(`   PurgeToken deployed to: ${tokenAddress}`);

    // 3. Deploy PurgeHub (the receiver on Base)
    console.log("\n3. Deploying PurgeHub...");
    // Bancor Params
    // Reserve Ratio: 20% (200,000 PPM) -> Steeper Price Curve (Price ~ S^4)
    const reserveRatio = 200000;
    // Initial Reserve: 0 (Logic handles first mint as linear baseline)
    const initialReserve = 0;

    const PurgeHub = await hre.ethers.getContractFactory("PurgeHub");
    const purgeHub = await PurgeHub.deploy(
        endpointAddress,
        deployer.address,
        tokenAddress,
        treasury,
        lpWallet,
        reserveRatio,
        initialReserve
    );
    await purgeHub.waitForDeployment();
    const hubAddress = await purgeHub.getAddress();
    console.log(`   PurgeHub deployed to: ${hubAddress}`);

    // 4. Transfer Token ownership to Hub
    console.log("\n4. Transferring PurgeToken ownership to Hub...");
    await purgeToken.transferOwnership(hubAddress);
    console.log("   Ownership transferred.");

    // 5. Authorize spoke chains on the Hub
    console.log("\n5. Authorizing spoke chains...");
    await purgeHub.setSpokeStatus(ETH_EID, true);
    await purgeHub.setSpokeStatus(SOLANA_EID, true);
    console.log("   Ethereum (30101) authorized");
    console.log("   Solana (30168) authorized");

    // 6. Deploy Mock USDC for testing
    console.log("\n6. Deploying Mock USDC...");
    const MockToken = await hre.ethers.getContractFactory("MockToken");
    const mockUsdc = await MockToken.deploy("USD Coin", "USDC");
    await mockUsdc.waitForDeployment();
    const usdcAddress = await mockUsdc.getAddress();
    console.log(`   MockUSDC deployed to: ${usdcAddress}`);

    // 7. Deploy Mock Router (1inch simulator)
    console.log("\n7. Deploying Mock Aggregator (1inch)...");
    const MockAggregator = await hre.ethers.getContractFactory("MockAggregator");
    const mockRouter = await MockAggregator.deploy(usdcAddress);
    await mockRouter.waitForDeployment();
    const routerAddress = await mockRouter.getAddress();
    console.log(`   MockAggregator deployed to: ${routerAddress}`);

    // 8. Deploy PurgeSpoke (simulating Ethereum spoke)
    console.log("\n8. Deploying PurgeSpoke (Ethereum)...");
    const PurgeSpoke = await hre.ethers.getContractFactory("PurgeSpoke");
    const purgeSpoke = await PurgeSpoke.deploy(
        endpointAddress,
        deployer.address,
        routerAddress,
        usdcAddress,
        BASE_EID  // Hub chain EID
    );
    await purgeSpoke.waitForDeployment();
    const spokeAddress = await purgeSpoke.getAddress();
    console.log(`   PurgeSpoke deployed to: ${spokeAddress}`);

    // 9. Set up LZ peers (Hub <-> Spoke)
    console.log("\n9. Setting up LayerZero peers...");
    const hubPeerBytes32 = hre.ethers.zeroPadValue(hubAddress, 32);
    const spokePeerBytes32 = hre.ethers.zeroPadValue(spokeAddress, 32);

    await purgeHub.setPeer(ETH_EID, spokePeerBytes32);
    await purgeSpoke.setPeer(BASE_EID, hubPeerBytes32);
    console.log("   Hub peer set for Ethereum spoke");
    console.log("   Spoke peer set for Base hub");

    console.log("\n" + "=".repeat(60));
    console.log("               DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log(`MockEndpointV2:  ${endpointAddress}`);
    console.log(`PurgeToken:      ${tokenAddress}`);
    console.log(`PurgeHub:        ${hubAddress}`);
    console.log(`PurgeSpoke:      ${spokeAddress}`);
    console.log(`MockUSDC:        ${usdcAddress}`);
    console.log(`MockAggregator:  ${routerAddress}`);
    console.log("=".repeat(60));
    console.log("\n✅ All contracts deployed and configured!\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
