
const { ethers } = require("hardhat");

async function main() {
    // V3 Contracts (Using lowercase to avoid Ethers v6 Checksum Strictness)
    const TOKEN_ADDRESS = "0xe4de7083042079040d9b180dcc8227b944209b42";

    // The Deployer/Admin Wallet (where the Relayer sent the tokens)
    const TARGET_WALLET = "0x5364e0440e57f7401e64a89eec7ac7998373dda6";

    console.log(`🔍 Checking PRG Balance on Base Sepolia...`);
    console.log(`   Token: ${TOKEN_ADDRESS}`);
    console.log(`   Wallet: ${TARGET_WALLET}`);

    const PurgeToken = await ethers.getContractFactory("PurgeToken");
    const token = PurgeToken.attach(TOKEN_ADDRESS);

    try {
        const balance = await token.balanceOf(TARGET_WALLET);
        const symbol = await token.symbol();
        console.log(`\n💰 BALANCE: ${ethers.formatEther(balance)} ${symbol}`);

        if (balance > 0n) {
            console.log("✅ Tokens successfully received!");
            console.log("\n(Note: This balance is on Base Sepolia. You need an EVM wallet to see it.)");
        } else {
            console.log("⚠️ Balance is 0.");
        }
    } catch (e) {
        console.error("❌ Error checking balance:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
