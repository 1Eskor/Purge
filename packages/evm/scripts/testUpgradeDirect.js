const { ethers } = require("hardhat");

async function main() {
    const [deployer, user1] = await ethers.getSigners();
    console.log("Testing UUPS Upgradeability (Direct Deploy)...");

    // Deploy Mock Endpoint
    const MockEndpoint = await ethers.getContractFactory("MockEndpointV2");
    const mockEndpoint = await MockEndpoint.deploy();
    const endpointAddr = await mockEndpoint.getAddress();
    console.log("Mock Endpoint:", endpointAddr);

    // Deploy Implementation
    console.log("Deploying PurgeToken Implementation...");
    const PurgeToken = await ethers.getContractFactory("PurgeToken");
    const impl = await PurgeToken.deploy(endpointAddr);
    await impl.waitForDeployment();
    const implAddr = await impl.getAddress();
    console.log("Implementation deployed to:", implAddr);

    // Deploy ERC1967 Proxy manually using wrapper
    console.log("Deploying Proxy...");
    const ERC1967Proxy = await ethers.getContractFactory("ERC1967ProxyWrapper");

    // Encode initialize call
    const initData = PurgeToken.interface.encodeFunctionData("initialize", [
        "Purge",
        "PRG",
        deployer.address
    ]);

    const proxy = await ERC1967Proxy.deploy(implAddr, initData);
    await proxy.waitForDeployment();
    const proxyAddr = await proxy.getAddress();
    console.log("Proxy deployed to:", proxyAddr);

    // Attach to proxy as PurgeToken
    const tokenProxy = PurgeToken.attach(proxyAddr);

    // Test functionality
    console.log("Testing mint...");
    await tokenProxy.mint(user1.address, ethers.parseEther("1000"));
    const balance = await tokenProxy.balanceOf(user1.address);
    console.log("User1 Balance:", ethers.formatEther(balance));

    if (balance == ethers.parseEther("1000")) {
        console.log("✅ Deployment and mint successful!");
    } else {
        console.log("❌ Test failed");
    }

    // Test upgrade to V2
    console.log("\nTesting Upgrade to V2...");
    const PurgeTokenV2 = await ethers.getContractFactory("PurgeTokenV2");
    const implV2 = await PurgeTokenV2.deploy(endpointAddr);
    await implV2.waitForDeployment();
    const implV2Addr = await implV2.getAddress();
    console.log("V2 Implementation deployed to:", implV2Addr);

    // Upgrade via proxy (UUPS pattern - call upgradeTo on the proxy)
    await tokenProxy.upgradeToAndCall(implV2Addr, "0x");
    console.log("Upgrade complete!");

    // Verify V2 functionality
    const tokenV2 = PurgeTokenV2.attach(proxyAddr);
    const version = await tokenV2.version();
    console.log("V2 Version:", version);

    if (version === "v2") {
        console.log("✅ Upgrade Verified: V2 Functionality active!");
    } else {
        console.log("❌ Logic Failure: Version incorrect");
    }

    // Verify state preserved
    const balanceAfter = await tokenV2.balanceOf(user1.address);
    console.log("User1 Balance After Upgrade:", ethers.formatEther(balanceAfter));

    if (balanceAfter == ethers.parseEther("1000")) {
        console.log("✅ State Preserved: Balance intact after upgrade!");
    } else {
        console.log("❌ State Lost!");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
