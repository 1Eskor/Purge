const { ethers, upgrades } = require("hardhat");
upgrades.silenceWarnings();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying Purge Protocol (UUPS) with account:", deployer.address);

    const ETH_EID = 30101;
    const BASE_EID = 30184;
    let endpointAddr;

    // 1. Determine Endpoint Address based on Network
    if (network.name === "hardhat" || network.name === "localhost") {
        console.log("Local Network detected. Deploying Mock Endpoint...");
        const MockEndpoint = await ethers.getContractFactory("MockEndpointV2");
        const mockEndpoint = await MockEndpoint.deploy();
        await mockEndpoint.waitForDeployment();
        endpointAddr = await mockEndpoint.getAddress();
        console.log("Mock Endpoint deployed to:", endpointAddr);
    } else if (network.name === "base") {
        console.log("Base Mainnet detected.");
        endpointAddr = process.env.BASE_LZ_ENDPOINT;
        if (!endpointAddr) {
            throw new Error("Missing BASE_LZ_ENDPOINT in .env file");
        }
        console.log("Using Configured Endpoint:", endpointAddr);
    } else if (network.name === "baseSepolia") {
        console.log("Base Sepolia Testnet detected.");
        // LayerZero V2 Base Sepolia Endpoint (EID: 40245)
        endpointAddr = process.env.BASE_SEPOLIA_LZ_ENDPOINT || "0x6EDCE65403992e310A62460808c4b910D972f10f";
        console.log("Using Testnet Endpoint:", endpointAddr);
    } else {
        throw new Error(`Unsupported network: ${network.name}`);
    }

    // 2. Deploy PurgeToken (UUPS Proxy)
    const PurgeToken = await ethers.getContractFactory("PurgeToken");
    console.log("Deploying PurgeToken Proxy...");
    const purgeToken = await upgrades.deployProxy(PurgeToken, [
        "Purge",
        "PRG",
        // endpointAddr, REMOVED from init
        deployer.address
    ], {
        initializer: 'initialize',
        kind: 'uups',
        constructorArgs: [endpointAddr],
        unsafeAllow: ['state-variable-immutable', 'constructor', 'missing-public-upgradeto-call'],
        unsafeSkipStorageCheck: true
    });

    await purgeToken.waitForDeployment();
    const tokenAddr = await purgeToken.getAddress();
    console.log("PurgeToken Proxy deployed to:", tokenAddr);

    // 3. Deploy PurgeHub (UUPS Proxy)
    const reserveRatio20 = 200000;
    const initialReserve = 0;

    const PurgeHub = await ethers.getContractFactory("PurgeHub");
    console.log("Deploying PurgeHub Proxy...");
    const purgeHub = await upgrades.deployProxy(PurgeHub, [
        // endpointAddr, REMOVED from init
        deployer.address,
        tokenAddr,
        deployer.address, // Treasury
        deployer.address, // LP
        reserveRatio20,
        initialReserve
    ], {
        initializer: 'initialize',
        kind: 'uups',
        constructorArgs: [endpointAddr],
        unsafeAllow: ['state-variable-immutable', 'constructor', 'missing-public-upgradeto-call'],
        unsafeSkipStorageCheck: true
    });

    await purgeHub.waitForDeployment();
    const hubAddr = await purgeHub.getAddress();
    console.log("PurgeHub Proxy deployed to:", hubAddr);

    // 4. Post-Deployment Setup
    console.log("Transferring Token Ownership to Hub...");
    await purgeToken.transferOwnership(hubAddr);

    console.log("Configuring Hub...");
    await purgeHub.setSpokeStatus(ETH_EID, true);
    // Peer setup usually requires remote address, skipping for local deploy script

    console.log("Deployment Complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
