const { ethers } = require("hardhat");

async function main() {
    const [deployer, user] = await ethers.getSigners();
    console.log("Testing PurgeSpoke with Mock DEX Router...\n");

    // 1. Deploy Mock Endpoint
    console.log("--- Deploying Infrastructure ---");
    const MockEndpoint = await ethers.getContractFactory("MockEndpointV2");
    const mockEndpoint = await MockEndpoint.deploy();
    const endpointAddr = await mockEndpoint.getAddress();
    console.log("Mock LZ Endpoint:", endpointAddr);

    // 2. Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    const usdcAddr = await usdc.getAddress();
    console.log("Mock USDC:", usdcAddr);

    // 3. Deploy Mock Victim Token
    const MockVictimToken = await ethers.getContractFactory("MockVictimToken");
    const victimToken = await MockVictimToken.deploy();
    const victimAddr = await victimToken.getAddress();
    console.log("Mock Victim Token:", victimAddr);

    // 4. Deploy Mock DEX Router
    const MockDEXRouter = await ethers.getContractFactory("MockDEXRouter");
    const router = await MockDEXRouter.deploy(usdcAddr);
    const routerAddr = await router.getAddress();
    console.log("Mock DEX Router:", routerAddr);

    // 5. Fund the router with USDC (so it can "swap" tokens)
    await usdc.transfer(routerAddr, ethers.parseUnits("1000000", 6)); // 1M USDC
    console.log("Router funded with 1M USDC");

    // 6. Deploy PurgeSpoke
    const HUB_EID = 30184; // Base
    const PurgeSpoke = await ethers.getContractFactory("PurgeSpoke");
    const spoke = await PurgeSpoke.deploy(
        endpointAddr,
        deployer.address,
        routerAddr,
        usdcAddr,
        HUB_EID
    );
    const spokeAddr = await spoke.getAddress();
    console.log("PurgeSpoke:", spokeAddr);

    console.log("\n--- Setting Up Test ---");

    // 7. Give user some victim tokens
    const purgeAmount = ethers.parseEther("100"); // 100 victim tokens
    await victimToken.transfer(user.address, purgeAmount);
    console.log("User received 100 Victim Tokens");

    // 8. User approves spoke to spend victim tokens
    await victimToken.connect(user).approve(spokeAddr, purgeAmount);
    console.log("User approved Spoke to spend tokens");

    console.log("\n--- Executing Purge ---");

    // 9. Generate swap calldata
    const swapData = await router.encodeSwapData(victimAddr, purgeAmount);
    console.log("Swap calldata generated");

    // 10. Calculate expected USDC output (1:1 at default rate)
    // Note: MockUSDC uses 6 decimals, VictimToken uses 18
    // With 1:1 rate and same decimals in mock, we expect the same amount
    const expectedUsdc = purgeAmount; // 100e18 in our mock (simplified)
    const minUsdc = expectedUsdc * 95n / 100n; // 5% slippage tolerance

    // 11. Execute purge
    try {
        const tx = await spoke.connect(user).purge(
            victimAddr,
            purgeAmount,
            swapData,
            minUsdc,
            expectedUsdc,
            { value: ethers.parseEther("0.01") } // LZ fee
        );
        const receipt = await tx.wait();
        console.log("Purge executed! Gas used:", receipt.gasUsed.toString());

        // Check events
        const purgeEvent = receipt.logs.find(
            log => log.fragment && log.fragment.name === "PurgeInitiated"
        );
        if (purgeEvent) {
            console.log("\n✅ PurgeInitiated Event:");
            console.log("   User:", purgeEvent.args.user);
            console.log("   Token:", purgeEvent.args.token);
            console.log("   Token Amount:", ethers.formatEther(purgeEvent.args.tokenAmount));
            console.log("   USDC Received:", ethers.formatEther(purgeEvent.args.usdcReceived));
            console.log("   Message GUID:", purgeEvent.args.guid);
        }

        const swapEvent = receipt.logs.find(
            log => log.fragment && log.fragment.name === "SwapExecuted"
        );
        if (swapEvent) {
            console.log("\n✅ SwapExecuted Event:");
            console.log("   Src Token:", swapEvent.args.srcToken);
            console.log("   Src Amount:", ethers.formatEther(swapEvent.args.srcAmount));
            console.log("   USDC Received:", ethers.formatEther(swapEvent.args.usdcReceived));
        }

        console.log("\n✅ Purge Test PASSED!");

    } catch (error) {
        console.error("❌ Purge Test FAILED:", error.message);
    }

    // Test Pause functionality
    console.log("\n--- Testing Pause Functionality ---");
    await spoke.pause();
    console.log("Contract paused");

    try {
        await spoke.connect(user).purge(
            victimAddr,
            purgeAmount,
            swapData,
            minUsdc,
            expectedUsdc,
            { value: ethers.parseEther("0.01") }
        );
        console.log("❌ Should have reverted when paused!");
    } catch (error) {
        if (error.message.includes("EnforcedPause")) {
            console.log("✅ Correctly reverted when paused");
        } else {
            console.log("❌ Wrong error:", error.message);
        }
    }

    await spoke.unpause();
    console.log("Contract unpaused");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
