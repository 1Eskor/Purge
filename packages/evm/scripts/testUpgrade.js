const { ethers, upgrades } = require("hardhat");
upgrades.silenceWarnings();
const { expect } = require("chai");

async function main() {
    const [deployer, user1] = await ethers.getSigners();
    console.log("Testing UUPS Upgradeability...");

    const MockEndpoint = await ethers.getContractFactory("MockEndpointV2");
    const mockEndpoint = await MockEndpoint.deploy();
    const endpointAddr = await mockEndpoint.getAddress();

    // 1. Deploy V1
    console.log("Deploying V1...");
    const PurgeToken = await ethers.getContractFactory("PurgeToken");
    const tokenProxy = await upgrades.deployProxy(PurgeToken, [
        "Purge", "PRG", deployer.address
    ], {
        initializer: 'initialize',
        kind: 'uups',
        constructorArgs: [endpointAddr],
        unsafeAllow: ['state-variable-immutable', 'constructor', 'missing-public-upgradeto-call'],
        unsafeSkipStorageCheck: true
    });
    await tokenProxy.waitForDeployment();
    const proxyAddress = await tokenProxy.getAddress();
    console.log("V1 Deployed at:", proxyAddress);

    // 2. Create State (Mint)
    console.log("Minting 1000 tokens to User 1...");
    await tokenProxy.mint(user1.address, ethers.parseEther("1000"));
    const balanceBefore = await tokenProxy.balanceOf(user1.address);
    console.log("Balance V1:", ethers.formatEther(balanceBefore));

    // 3. Upgrade to V2
    console.log("Upgrading to V2...");
    const PurgeTokenV2 = await ethers.getContractFactory("PurgeTokenV2");
    const upgradedProxy = await upgrades.upgradeProxy(proxyAddress, PurgeTokenV2, {
        constructorArgs: [endpointAddr],
        unsafeAllow: ['state-variable-immutable', 'constructor', 'missing-public-upgradeto-call'],
        unsafeSkipStorageCheck: true
    });
    console.log("Upgrade Complete.");

    // 4. Verify State Preserved
    const balanceAfter = await upgradedProxy.balanceOf(user1.address);
    console.log("Balance V2:", ethers.formatEther(balanceAfter));

    if (balanceBefore === balanceAfter) {
        console.log("✅ State Preserved: Balances match.");
    } else {
        console.error("❌ State Failure: Balances lost!");
        process.exit(1);
    }

    // 5. Verify New Logic
    try {
        const version = await upgradedProxy.version();
        console.log("Version check:", version);
        if (version === "v2") {
            console.log("✅ Logic Upgrade Verified: V2 Functionality active.");
        } else {
            console.error("❌ Logic Failure: Version incorrect.");
        }
    } catch (e) {
        console.error("❌ Logic Failure: Version function not found.", e);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
