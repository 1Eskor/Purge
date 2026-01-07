import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../packages/evm/.env") });

// --- CONFIGURATION ---
const SOLANA_RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re");
const BASE_RPC = "https://sepolia.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "fe1419000a2dfc17b972e6cd66ee37d7eb9ae536d72303b138d215c45858e46b";
const SOLANA_CHAIN_ID = 40168;

// PurgeHub ABI (minimal)
// Connect to the verified v3 PurgeHub Proxy
const CORE_PURGE_HUB = "0xd8f6cE134E51c164395793B6c2Af932F4B5bD2DC";

const PURGE_HUB_ABI = [
    "function receivePurge(uint32 srcChainId, bytes32 srcAddress, address recipient, uint256 amount, uint64 nonce) external"
];

// Load IDL
const IDL_PATH = path.resolve(__dirname, "../../packages/solana/target/idl/purge.json");

async function main() {
    console.log("🚀 Starting Purge Relayer Bot...");
    console.log(`📡 Listening on Solana Devnet: ${PROGRAM_ID.toBase58()}`);
    console.log(`🎯 Targeting Base Sepolia Core: ${CORE_PURGE_HUB}`);

    if (!fs.existsSync(IDL_PATH)) {
        console.error("❌ IDL not found at", IDL_PATH);
        process.exit(1);
    }
    const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));

    // 1. Setup Solana Listener
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const wallet = { publicKey: Keypair.generate().publicKey, signTransaction: () => Promise.resolve(), signAllTransactions: () => Promise.resolve() };
    const provider = new AnchorProvider(connection, wallet as any, {});
    const program = new Program(idl as Idl, PROGRAM_ID, provider);

    // 2. Setup EVM Signer
    const evmProvider = new ethers.JsonRpcProvider(BASE_RPC);
    const signer = new ethers.Wallet(PRIVATE_KEY, evmProvider);
    // Connect to Core PurgeHub where we are authorized
    const purgeHub = new ethers.Contract(CORE_PURGE_HUB, PURGE_HUB_ABI, signer);

    console.log("✅ Connected to networks. Waiting for events...");

    // 3. Subscribe to Events
    program.addEventListener("PurgeEvent", async (event, slot, signature) => {
        console.log(`\n🔔 New Purge Event Detected! (Sig: ${signature})`);

        try {
            const { user, amount, nonce } = event;

            console.log(`User (Solana): ${user.toString()}`);
            console.log(`Amount (USDC): ${amount.toString()}`);

            // DEMO MAPPING
            const targetRecipient = "0x5364e0440e57F7401e64A89eEC7aC7998373Dda6";
            console.log(`mapped to EVM Recipient: ${targetRecipient}`);

            // The srcAddress must be the Solana Program ID (Trusted Peer), not the User's wallet
            // The PurgeHub checks if (trustedPeers[srcChainId] == srcAddress)
            const srcAddressBytes32 = "0x" + PROGRAM_ID.toBuffer().toString("hex").padEnd(64, '0');
            const amountBn = BigInt(amount.toString());
            const nonceBn = BigInt(nonce.toString());

            console.log(`🔄 Bridging to Base...`);

            // Call receivePurge on PurgeHub
            const tx = await purgeHub.receivePurge(
                SOLANA_CHAIN_ID,
                srcAddressBytes32,
                targetRecipient,
                amountBn,
                nonceBn
            );

            console.log(`⏳ Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log(`✅ Success! PRG Minted on Base.`);

        } catch (err) {
            console.error("❌ Relayer Error:", err);
            if (JSON.stringify(err).includes("Nonce already processed")) {
                console.log("⚠️ This nonce was already bridged.");
            }
        }
    });
}

main().catch(console.error);
