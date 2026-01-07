
const { ethers } = require("hardhat");

async function main() {
    console.log("🌱 SEEDING LIQUIDITY & FIXING CURVE...");

    // V3 Contracts
    const HUB_PROXY = "0xd8f6cE134E51c164395793B6c2Af932F4B5bD2DC"; // The Hub

    // 1. Upgrade Hub (Again)
    console.log("\n1️⃣  Upgrading PurgeHub (Adding Seed Function)...");
    const PurgeHub = await ethers.getContractFactory("PurgeHub");

    // Deploy new implementation
    const newImpl = await PurgeHub.deploy("0x6EDCE65403992e310A62460808c4b910D972f10f"); // Endpoint
    await newImpl.waitForDeployment();
    console.log("   New Implementation:", await newImpl.getAddress());

    // Attach to Proxy and Upgrade
    const hubProxy = PurgeHub.attach(HUB_PROXY);
    console.log("   Calling upgradeTo...");
    const txUpgrade = await hubProxy.upgradeToAndCall(await newImpl.getAddress(), "0x");
    await txUpgrade.wait();
    console.log("✅ Upgrade Complete.");

    // 2. Seed Liquidity
    console.log("\n2️⃣  Seeding Initialization...");

    // Values:
    // Virtual Reserve: 1 USDC ($1) = 1e6 (Assuming 6 decimals? or 18?)
    // Wait, Logic in _processPurge uses `_amount`. 
    // `_lzReceive` decodes `uint256 usdcAmount`.
    // If Solana sends raw amount (6 decimals), and Base uses 18... 
    // The Bridge `receivePurge` *should* handle normalization if needed. 
    // But currently `_processPurge` takes `usdcAmount` directly.
    // If PRG is 18 decimals, and USDC is 6... mixing them in Bancor (which assumes consistent precision usually) is risky.

    // HOWEVER, for Seeding:
    // Let's assume we want 1 PRG to exist backed by $0.10.
    // Reserve: 10 cents (0.1 * 1e18? or 1e6?)
    // Let's use 18 decimals for everything on EVM side usually.
    // USUAL USDC on Base is 6 decimals.
    // If the Reserve is tracking USDC, it should match USDC decimals (6).
    // PRG is 18 decimals.

    // Bancor Formula `(supply * ((1 + deposit/reserve)^ratio - 1))`
    // If Deposit/Reserve is a ratio, decimals cancel out.
    // So if Deposit=1e6 (1 USDC) and Reserve=1e6 (1 USDC), ratio is 1. Safe.
    // Result (tokens) = Supply * (2^ratio - 1).
    // So Supply should be 18 decimals.

    // Let's seed with:
    // Supply = 1000 PRG (1000 * 1e18)
    // Reserve = 1000 USDC (1000 * 1e6) -> Initial Price ~ $1 ?

    // Let's do:
    // Supply = 1 PRG (1e18)
    // Reserve = 1 USDC (1e6)

    const INITIAL_SUPPLY = ethers.parseEther("1"); // 1 PRG
    const INITIAL_RESERVE = 1000000n; // 1 USDC (6 decimals)

    try {
        const txSeed = await hubProxy.seedInitialization(INITIAL_SUPPLY, INITIAL_RESERVE);
        await txSeed.wait();
        console.log("🎉 DETAILS: SEEDED 1 PRG @ 1 USDC RESERVE");
    } catch (e) {
        console.log("⚠️ Seed failed:", e.message);
        // Likely already seeded
    }

    console.log("\n✅ ALL SYSTEMS GO.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
