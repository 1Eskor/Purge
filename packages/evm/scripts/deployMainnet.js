const { ethers, network } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=".repeat(50));
    console.log("PURGE PROTOCOL - MAINNET DEPLOYMENT");
    console.log("=".repeat(50));
    console.log("Network:", network.name);
    console.log("Deployer:", deployer.address);

    // Validate network
    if (network.name !== "base" && network.name !== "baseSepolia" && network.name !== "hardhat") {
        throw new Error(`Invalid network: ${network.name}. Use 'base' for mainnet or 'baseSepolia' for testnet.`);
    }

    // LayerZero Endpoint addresses
    let endpointAddr;
    if (network.name === "hardhat") {
        // Deploy mock for local testing
        const MockEndpoint = await ethers.getContractFactory("MockEndpointV2");
        const mockEndpoint = await MockEndpoint.deploy();
        endpointAddr = await mockEndpoint.getAddress();
        console.log("Mock LZ Endpoint:", endpointAddr);
    } else {
        const LZ_ENDPOINTS = {
            base: "0x1a44076050125825900e736c501f859c50fE728c",      // Base Mainnet
            baseSepolia: "0x6EDCE65403992e310A62460808c4b910D972f10f" // Base Sepolia
        };
        endpointAddr = LZ_ENDPOINTS[network.name];
        console.log("LZ Endpoint:", endpointAddr);
    }

    // LayerZero Endpoint IDs (for spoke configuration)
    const SPOKE_EIDS = {
        ethereum: 30101,
        arbitrum: 30110,
        optimism: 30111,
        polygon: 30109,
        bnb: 30102
    };

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer Balance:", ethers.formatEther(balance), "ETH");

    if (balance === 0n) {
        throw new Error("No ETH in deployer account!");
    }

    console.log("\n--- Step 1: Deploy PurgeToken Implementation ---");
    const PurgeToken = await ethers.getContractFactory("PurgeToken");
    const tokenImpl = await PurgeToken.deploy(endpointAddr);
    await tokenImpl.waitForDeployment();
    const tokenImplAddr = await tokenImpl.getAddress();
    console.log("PurgeToken Implementation:", tokenImplAddr);

    console.log("\n--- Step 2: Deploy PurgeToken Proxy ---");
    const ERC1967Proxy = await ethers.getContractFactory("ERC1967ProxyWrapper");
    const tokenInitData = PurgeToken.interface.encodeFunctionData("initialize", [
        "Purge",
        "PRG",
        deployer.address
    ]);
    const tokenProxy = await ERC1967Proxy.deploy(tokenImplAddr, tokenInitData, { gasLimit: 3000000 });
    await tokenProxy.waitForDeployment();
    const tokenAddr = await tokenProxy.getAddress();
    console.log("PurgeToken Proxy:", tokenAddr);

    console.log("\n--- Step 3: Deploy PurgeHub Implementation ---");
    const PurgeHub = await ethers.getContractFactory("PurgeHub");
    const hubImpl = await PurgeHub.deploy(endpointAddr);
    await hubImpl.waitForDeployment();
    const hubImplAddr = await hubImpl.getAddress();
    console.log("PurgeHub Implementation:", hubImplAddr);

    console.log("\n--- Step 4: Deploy PurgeHub Proxy ---");
    // Production settings
    const RESERVE_RATIO = 200000;  // 20% - Creates steeper bonding curve
    const INITIAL_RESERVE = 0;     // Start empty, grows with purges

    const hubInitData = PurgeHub.interface.encodeFunctionData("initialize", [
        deployer.address,  // Delegate (later transfer to multisig)
        tokenAddr,         // PurgeToken address
        deployer.address,  // Treasury (later set to multisig)
        deployer.address,  // LP Wallet (later set to multisig)
        RESERVE_RATIO,
        INITIAL_RESERVE
    ]);
    const hubProxy = await ERC1967Proxy.deploy(hubImplAddr, hubInitData);
    await hubProxy.waitForDeployment();
    const hubAddr = await hubProxy.getAddress();
    console.log("PurgeHub Proxy:", hubAddr);

    console.log("\n--- Step 5: Configure Ownership ---");
    const tokenContract = PurgeToken.attach(tokenAddr);
    const hubContract = PurgeHub.attach(hubAddr);

    console.log("Transferring Token ownership to Hub...");
    const tx1 = await tokenContract.transferOwnership(hubAddr);
    await tx1.wait();
    console.log("✅ Token ownership transferred");

    console.log("\n--- Step 6: Configure Spoke Endpoints ---");
    for (const [chain, eid] of Object.entries(SPOKE_EIDS)) {
        console.log(`  Enabling ${chain} (EID: ${eid})...`);
        const tx = await hubContract.setSpokeStatus(eid, true);
        await tx.wait();
    }
    console.log("✅ All spokes enabled");

    console.log("\n" + "=".repeat(50));
    console.log("DEPLOYMENT COMPLETE!");
    console.log("=".repeat(50));
    console.log("\nContract Addresses:");
    console.log("-------------------");
    console.log("PurgeToken (Proxy):", tokenAddr);
    console.log("PurgeToken (Impl):", tokenImplAddr);
    console.log("PurgeHub (Proxy):", hubAddr);
    console.log("PurgeHub (Impl):", hubImplAddr);
    console.log("-------------------");

    console.log("\n⚠️  NEXT STEPS:");
    console.log("1. Verify contracts on BaseScan");
    console.log("2. Set up LayerZero peers (setPeer) for each spoke");
    console.log("3. Transfer Hub ownership to Gnosis Safe multisig");
    console.log("4. Update treasury/LP wallets to multisig addresses");
    console.log("5. Deploy PurgeSpoke on each chain");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
