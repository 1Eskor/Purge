const hre = require("hardhat");

async function main() {
    // Contract addresses from deployment
    const ENDPOINT_ADDR = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const TOKEN_ADDR = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    const HUB_ADDR = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

    const [deployer] = await hre.ethers.getSigners();

    // Get contract instances
    const purgeToken = await hre.ethers.getContractAt("PurgeToken", TOKEN_ADDR);
    const purgeHub = await hre.ethers.getContractAt("PurgeHub", HUB_ADDR);

    console.log("\n=== PURGE PROTOCOL STATUS ===\n");

    // Token Info
    console.log("📦 PurgeToken:");
    console.log("   Address:", TOKEN_ADDR);
    console.log("   Name:", await purgeToken.name());
    console.log("   Symbol:", await purgeToken.symbol());
    console.log("   Owner:", await purgeToken.owner());
    console.log("   Total Supply:", hre.ethers.formatEther(await purgeToken.totalSupply()), "PURGE");

    // Hub Info
    console.log("\n🏠 PurgeHub:");
    console.log("   Address:", HUB_ADDR);
    console.log("   Treasury:", await purgeHub.treasury());
    console.log("   LP Wallet:", await purgeHub.lpWallet());
    console.log("   Token:", await purgeHub.purgeToken());

    // Tax Rates
    console.log("\n💰 Tax Configuration:");
    console.log("   LP Tax:        ", (await purgeHub.TAX_BP_LP()).toString(), "BPS (5%)");
    console.log("   Reflect Tax:   ", (await purgeHub.TAX_BP_REFLECT()).toString(), "BPS (3%)");
    console.log("   Treasury Tax:  ", (await purgeHub.TAX_BP_TREASURY()).toString(), "BPS (1.5%)");
    console.log("   Burn Tax:      ", (await purgeHub.TAX_BP_BURN()).toString(), "BPS (0.5%)");

    // Accounts
    console.log("\n👤 Test Accounts:");
    console.log("   Deployer:", deployer.address);
    console.log("   ETH Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

    console.log("\n=============================\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
