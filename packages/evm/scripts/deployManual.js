const { ethers, network } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Starting Manual Deployment to", network.name);
    console.log("Deployer:", deployer.address);

    const ETH_EID = 30101;
    const BASE_SEPOLIA_EID = 40245;
    let endpointAddr;

    if (network.name === "baseSepolia") {
        endpointAddr = process.env.BASE_SEPOLIA_LZ_ENDPOINT || "0x6EDCE65403992e310A62460808c4b910D972f10f";
    } else if (network.name === "hardhat" || network.name === "localhost") {
        const MockEndpoint = await ethers.getContractFactory("MockEndpointV2");
        const mockEndpoint = await MockEndpoint.deploy();
        endpointAddr = await mockEndpoint.getAddress();
    } else {
        throw new Error("Unsupported network for this script");
    }
    console.log("Endpoint Address:", endpointAddr);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "ETH");
    if (balance === 0n) {
        throw new Error("No ETH in deployer account. Please get some from a faucet.");
    }

    // 1. Deploy PurgeToken Implementation
    console.log("\nDeploying PurgeToken Implementation...");
    const PurgeToken = await ethers.getContractFactory("PurgeToken");
    const tokenImpl = await PurgeToken.deploy(endpointAddr);
    console.log("Transaction Hash:", tokenImpl.deploymentTransaction().hash);

    console.log("Waiting for deployment...");
    await tokenImpl.waitForDeployment();
    const tokenImplAddr = await tokenImpl.getAddress();
    console.log("PurgeToken Implementation:", tokenImplAddr);

    // 2. Deploy PurgeToken Proxy
    console.log("Deploying PurgeToken Proxy...");
    const ERC1967Proxy = await ethers.getContractFactory("ERC1967ProxyWrapper");
    const tokenInitData = PurgeToken.interface.encodeFunctionData("initialize", ["Purge", "PRG", deployer.address]);
    const tokenProxy = await ERC1967Proxy.deploy(tokenImplAddr, tokenInitData);
    await tokenProxy.waitForDeployment();
    const tokenAddr = await tokenProxy.getAddress();
    console.log("PurgeToken Proxy:", tokenAddr);

    // 3. Deploy PurgeHub Implementation
    console.log("\nDeploying PurgeHub Implementation...");
    const PurgeHub = await ethers.getContractFactory("PurgeHub");
    const hubImpl = await PurgeHub.deploy(endpointAddr);
    await hubImpl.waitForDeployment();
    const hubImplAddr = await hubImpl.getAddress();
    console.log("PurgeHub Implementation:", hubImplAddr);

    // 4. Deploy PurgeHub Proxy
    console.log("Deploying PurgeHub Proxy...");
    const reserveRatio20 = 200000;
    const initialReserve = 0;
    const hubInitData = PurgeHub.interface.encodeFunctionData("initialize", [
        deployer.address,
        tokenAddr,
        deployer.address, // Treasury
        deployer.address, // LP
        reserveRatio20,
        initialReserve
    ]);
    const hubProxy = await ERC1967Proxy.deploy(hubImplAddr, hubInitData);
    await hubProxy.waitForDeployment();
    const hubAddr = await hubProxy.getAddress();
    console.log("PurgeHub Proxy:", hubAddr);

    // 5. Setup
    console.log("\nSetting up...");
    const tokenContract = PurgeToken.attach(tokenAddr);
    const hubContract = PurgeHub.attach(hubAddr);

    console.log("Transferring Token ownership to Hub...");
    const tx1 = await tokenContract.transferOwnership(hubAddr);
    await tx1.wait();

    console.log("Configuring Hub Spoke Status...");
    const tx2 = await hubContract.setSpokeStatus(ETH_EID, true);
    await tx2.wait();

    console.log("\nDeployment Complete!");
    console.log("-------------------");
    console.log("PurgeToken (Proxy):", tokenAddr);
    console.log("PurgeHub (Proxy):", hubAddr);
    console.log("-------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
