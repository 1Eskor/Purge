#!/bin/bash
# Initialize the Purge Program on Solana Devnet

set -e

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

echo "========================================="
echo "   PURGE PROGRAM INITIALIZATION SCRIPT   "
echo "========================================="
echo ""

# Check balance
echo "Wallet balance: $(solana balance)"
echo ""

TEMP_DIR="/tmp/purge_init_$$"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

cat > package.json << 'EOF'
{"name":"init","dependencies":{"@coral-xyz/anchor":"^0.29.0","@solana/web3.js":"^1.91.0","@solana/spl-token":"^0.4.3"}}
EOF

echo "Installing dependencies..."
npm install --silent 2>/dev/null || npm install

cat > init.mjs << 'INITSCRIPT'
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";

const PROGRAM_ID = new PublicKey("EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

async function main() {
    console.log("Loading admin keypair...");
    const keypairData = JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8"));
    const admin = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    console.log("Admin:", admin.publicKey.toBase58());
    
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    const wallet = {
        publicKey: admin.publicKey,
        signTransaction: async (tx) => { tx.partialSign(admin); return tx; },
        signAllTransactions: async (txs) => { txs.forEach(tx => tx.partialSign(admin)); return txs; },
    };
    
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    
    const idl = JSON.parse(fs.readFileSync("/mnt/c/Users/zachs/.gemini/antigravity/scratch/purge/packages/solana/target/idl/purge.json", "utf-8"));
    
    // For Anchor 0.29, use 3 args: (idl, programId, provider)
    const program = new anchor.Program(idl, PROGRAM_ID, provider);
    console.log("Program loaded:", program.programId.toBase58());
    
    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
    const [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault"), USDC_MINT.toBuffer()], PROGRAM_ID);
    
    console.log("Config PDA:", configPda.toBase58());
    console.log("Vault PDA:", vaultPda.toBase58());
    
    // Check if already initialized
    const configInfo = await connection.getAccountInfo(configPda);
    if (configInfo) {
        console.log("\n✅ Program already initialized!");
        console.log("Config exists at:", configPda.toBase58());
        return;
    }
    
    console.log("\nInitializing program...");
    
    const remoteEid = 30184;
    const remoteAddress = Array(32).fill(0);
    
    const sig = await program.methods
        .initialize(remoteEid, remoteAddress)
        .accounts({
            admin: admin.publicKey,
            usdcMint: USDC_MINT,
            config: configPda,
            spokeUsdcVault: vaultPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([admin])
        .rpc();
    
    console.log("\n✅ SUCCESS!");
    console.log("Signature:", sig);
    console.log("Explorer: https://explorer.solana.com/tx/" + sig + "?cluster=devnet");
}

main().catch(err => {
    console.error("Error:", err.message);
    if (err.logs) console.error("Logs:", err.logs);
    process.exit(1);
});
INITSCRIPT

echo ""
echo "Running initialization..."
echo "========================================="
node init.mjs

cd /
rm -rf "$TEMP_DIR"
echo ""
echo "Done!"
