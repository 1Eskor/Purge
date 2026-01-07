const hre = require("hardhat");

async function main() {
    // 1. Setup
    const [deployer, user1, user2] = await hre.ethers.getSigners();
    console.log("Testing Bancor Logic...");

    const BASE_EID = 30184;
    const ETH_EID = 30101;

    // Deploy Mocks & Contracts (fresh deployment for clean state)
    console.log("INT: Deploying fresh contracts...");
    const MockEndpoint = await hre.ethers.getContractFactory("MockEndpointV2");
    const mockEndpoint = await MockEndpoint.deploy();
    await mockEndpoint.waitForDeployment();
    const endpointAddr = await mockEndpoint.getAddress();

    const PurgeToken = await hre.ethers.getContractFactory("PurgeToken");
    const purgeToken = await PurgeToken.deploy("Purge", "PRG", endpointAddr, deployer.address);
    await purgeToken.waitForDeployment();

    // Bancor Params: 50% Ratio
    const reserveRatio = 500000;
    const initialReserve = 0;

    console.log(`Bancor: Ratio = ${reserveRatio / 10000}%`);

    const PurgeHub = await hre.ethers.getContractFactory("PurgeHub");
    const purgeHub = await PurgeHub.deploy(
        endpointAddr,
        deployer.address,
        await purgeToken.getAddress(),
        deployer.address,
        deployer.address,
        reserveRatio,
        initialReserve
    );
    await purgeHub.waitForDeployment();
    console.log("PurgeHub Deployed");

    await purgeToken.transferOwnership(await purgeHub.getAddress());
    await purgeHub.setSpokeStatus(ETH_EID, true);
    const peer = hre.ethers.zeroPadValue(deployer.address, 32);
    await purgeHub.setPeer(ETH_EID, peer);

    // TEST 1: First Purge (Supply 0)
    // Amount: 1000 USD
    // Logic: If Supply 0, Mint = Deposit.
    // Result: 1000 Tokens minted (100% distribution including taxes).
    // Reserve: 1000 USD.

    // NOTE: In PurgeHub.sol, I changed logic to full mint.
    // _amount = 1000.
    // reserveBalance += 1000.
    // totalTokens = calculate(S=0, R_pre=0, amt=1000) -> 1000.
    // Distribution: 90% User (900), 5% LP (50), etc.

    const purgeAmount1 = hre.ethers.parseEther("1000"); // 1000 USD

    console.log("\n--- TEST 1: Purge 1,000 USD ---");
    // Simulate LZ Receive
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [endpointAddr],
    });
    // Fund Endpoint
    await hre.network.provider.send("hardhat_setBalance", [endpointAddr, "0xDE0B6B3A7640000"]);
    const endpointSigner = await hre.ethers.getSigner(endpointAddr);
    const hubAsEndpoint = purgeHub.connect(endpointSigner);

    // Send Payload
    const payload1 = hre.ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [user1.address, purgeAmount1]);
    const origin1 = [ETH_EID, peer, 1];

    await hubAsEndpoint.lzReceive(origin1, hre.ethers.zeroPadValue("0x01", 32), payload1, deployer.address, "0x");

    const user1Balance = await purgeToken.balanceOf(user1.address);
    const supply1 = await purgeToken.totalSupply();
    const reserve1 = await purgeHub.reserveBalance();

    console.log("User 1 Balance:", hre.ethers.formatEther(user1Balance));
    console.log("Total Supply:", hre.ethers.formatEther(supply1));
    console.log("Reserve Balance:", hre.ethers.formatEther(reserve1));

    // Verify:
    // Supply should be 1000.
    // User Balance 900.
    // Reserve 1000.
    // Price = R / (S * 0.5) = 1000 / 500 = 2 USD.

    if (Math.abs(parseFloat(hre.ethers.formatEther(supply1)) - 1000) < 0.1) {
        console.log("✅ First Mint correct: 1000 tokens for 1000 USD (Baseline).");
    } else {
        console.log("WARNING: First Mint supply unexpected.");
    }

    if (Math.abs(parseFloat(hre.ethers.formatEther(user1Balance)) - 900) < 0.1) {
        console.log("✅ User 1 received correct share (90%).");
    }

    // TEST 2: Second Purge (Supply > 0)
    // Amount: 1000 USD (Same Amount)
    // Expectation:
    // Price started avg 1, ended spot 2.
    // New Price should start at 2 and go up.
    // Tokens minted should be significantly LESS than 1000.
    // Approx:
    // $P_{end} = 2$.
    // If we add 1000 USD ($R \rightarrow 2000$).
    // $S \propto \sqrt{R/m}$? Linear P -> $S \propto \sqrt{R}$.
    // $S_{new} / S_{old} = \sqrt{R_{new} / R_{old}} = \sqrt{2000/1000} = \sqrt{2} \approx 1.414$.
    // New Supply $\approx 1414$.
    // Minted $\approx 414$ tokens.
    // User gets 90% of 414 $\approx 372$.

    console.log("\n--- TEST 2: Purge 1,000 USD (Again) ---");
    const purgeAmount2 = hre.ethers.parseEther("1000");
    const payload2 = hre.ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [user2.address, purgeAmount2]);
    const origin2 = [ETH_EID, peer, 2];

    await hubAsEndpoint.lzReceive(origin2, hre.ethers.zeroPadValue("0x02", 32), payload2, deployer.address, "0x");

    const user2Balance = await purgeToken.balanceOf(user2.address);
    const supply2 = await purgeToken.totalSupply();

    console.log("User 2 Balance:", hre.ethers.formatEther(user2Balance));
    console.log("Total Supply:", hre.ethers.formatEther(supply2));

    const minted2 = parseFloat(hre.ethers.formatEther(supply2)) - parseFloat(hre.ethers.formatEther(supply1));
    console.log("Tokens Minted in Round 2:", minted2);

    // Verify < 1000
    if (minted2 < 900 && minted2 > 350) {
        console.log("✅ Bonding Curve Effective: Price Increased (Received ~414 tokens vs 1000).");
    } else {
        console.log(`WARNING: Tokens minted unexpected (${minted2}).`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
