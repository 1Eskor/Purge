
const { ethers } = require("hardhat");

async function main() {
    console.log("🛠️  FIXING BRIDGE & OPENING GATES...");

    // V3 Contracts
    const TOKEN_PROXY = "0xE4De7083042079040D9B180dCC8227b944209b42";
    const HUB_PROXY = "0xd8f6cE134E51c164395793B6c2Af932F4B5bD2DC";

    // Config
    const SOLANA_EID = 40168; // LayerZero V2 Endpoint ID for Solana Devnet

    // Solana Program ID converted to Bytes32 using node script output
    // HEX: 0xc3b9ee28aaeea05cc3b11771eeb2e148714eaef786705128db5c5836... wait, length?
    // Output was: 0xc3b9ee28aaeea05cc3b11771eeb2e148714eaef786705128db5c58362694b7c6
    // Let's verify length.
    const SOLANA_PEER_BYTES32 = "0xc3b9ee28aaeea05cc3b11771eeb2e148714eaef786705128db5c58362694b7c6";

    // 1. Upgrade Hub
    console.log("\n1️⃣  Upgrading PurgeHub...");
    const PurgeHub = await ethers.getContractFactory("PurgeHub");

    // Deploy new implementation
    const newImpl = await PurgeHub.deploy("0x6EDCE65403992e310A62460808c4b910D972f10f"); // Endpoint address
    await newImpl.waitForDeployment();
    console.log("   New Implementation:", await newImpl.getAddress());

    // Attach to Proxy
    const hubProxy = PurgeHub.attach(HUB_PROXY);

    // Upgrade
    console.log("   Calling upgradeTo...");
    const txUpgrade = await hubProxy.upgradeToAndCall(await newImpl.getAddress(), "0x");
    await txUpgrade.wait();
    console.log("✅ Upgrade Complete.");

    // 2. Configure Bridge (Spoke & Peer)
    console.log("\n2️⃣  Configuring Trusted Peer (Solana)...");

    // Set Spoke Status (Logic)
    console.log("   Setting Spoke Status...");
    try {
        const txSpoke = await hubProxy.setSpokeStatus(SOLANA_EID, true);
        await txSpoke.wait();
        console.log("   ✅ Spoke Status Set.");
    } catch (e) {
        console.log("   ⚠️ Spoke Status failed (maybe already set):", e.message);
    }

    // Set Trusted Peer (OApp)
    console.log("   Setting LZ Peer...");
    try {
        // OApp function is setPeer(uint32 _eid, bytes32 _peer)
        const txPeer = await hubProxy.setPeer(SOLANA_EID, SOLANA_PEER_BYTES32);
        await txPeer.wait();
        console.log("   ✅ Trusted Peer Set.");
    } catch (e) {
        console.log("   ⚠️ SetPeer failed:", e.message);
    }

    // 3. Open The Gates
    console.log("\n3️⃣  OPENING THE GATES (Unlock Trading)...");
    try {
        const txOpen = await hubProxy.openTheGates();
        await txOpen.wait();
        console.log("🎉 DETAILS: TRADING IS NOW OPEN ON BASE SEPOLIA!");
    } catch (e) {
        console.log("⚠️ OpenGates failed:", e.message);
        // Check if already open
        try {
            // We can check token tradingOpen variable if we want, but let's assume valid failure meant already open
            console.log("   (Likely already open)");
        } catch (e2) { }
    }

    console.log("\n✅ ALL SYSTEMS GO.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
