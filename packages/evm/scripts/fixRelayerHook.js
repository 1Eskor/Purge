
const { ethers } = require("hardhat");

async function main() {
    console.log("🔗 FIXING RELAYER HOOK...");

    // V3 Contracts
    const HUB_PROXY = "0xd8f6cE134E51c164395793B6c2Af932F4B5bD2DC";

    // 1. Upgrade Hub (Adding receivePurge)
    console.log("\n1️⃣  Upgrading PurgeHub...");
    const PurgeHub = await ethers.getContractFactory("PurgeHub");

    // Deploy new implementation
    const newImpl = await PurgeHub.deploy("0x6EDCE65403992e310A62460808c4b910D972f10f");
    await newImpl.waitForDeployment();
    console.log("   New Implementation:", await newImpl.getAddress());

    // Attach to Proxy and Upgrade
    const hubProxy = PurgeHub.attach(HUB_PROXY);
    console.log("   Calling upgradeTo...");
    const txUpgrade = await hubProxy.upgradeToAndCall(await newImpl.getAddress(), "0x");
    await txUpgrade.wait();
    console.log("✅ Upgrade Complete.");

    console.log("\n✅ RELAYER HOOK ACTIVE.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
