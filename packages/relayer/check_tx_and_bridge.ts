
import { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../packages/evm/.env") });

const SOLANA_RPC = "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey("EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re");
const BASE_RPC = "https://sepolia.base.org";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const CORE_PURGE_HUB = "0xd8f6cE134E51c164395793B6c2Af932F4B5bD2DC"; // v3 Proxy
const SOLANA_CHAIN_ID = 40168;

const PURGE_HUB_ABI = [
    "function receivePurge(uint32 srcChainId, bytes32 srcAddress, address recipient, uint256 amount, uint64 nonce) external"
];

const IDL_PATH = path.resolve(__dirname, "../../packages/solana/target/idl/purge.json");

async function main() {
    const txSignature = process.argv[2];
    if (!txSignature) {
        console.error("Please provide a transaction signature");
        process.exit(1);
    }

    console.log(`🔍 Checking TX: ${txSignature}`);

    const connection = new Connection(SOLANA_RPC, "confirmed");
    const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
    const provider = new AnchorProvider(connection, { publicKey: PublicKey.default } as any, {});
    const program = new Program(idl as Idl, PROGRAM_ID, provider);

    // Fetch parsed transaction
    const tx = await connection.getParsedTransaction(txSignature, { commitment: "confirmed" });

    if (!tx) {
        console.error("❌ Transaction not found!");
        return;
    }

    // Find the PurgeEvent log
    // This is tricky without an indexer, but we can look at the inner instructions or logs
    console.log("📜 Logs:", tx.meta?.logMessages);

    // Parse logs for event data (Simplified for manual verify)
    // We look for the "Program log: Instruction: Purge"
    // And try to extract params if possible, or just re-emit manually if we know the data.

    // BETTER WAY for this script: Just grab the event data if the parser supports it? 
    // Anchor events are base64 encoded strings in the logs starting with "Program log: "

    // For now, let's just HARDCODE the re-play based on what we see in the explorer/logs for this TX
    // user: (from log)
    // amount: (from log)
    // nonce: (from log)

    // Since parsing raw logs is hard in a quick script, could we just try to bridge a "Test" amount?
    // Or did the user want us to specifically bridge THIS tx?

    // Let's TRY to parse the Anchor Event:
    const eventParser = new (require("@coral-xyz/anchor").EventParser)(PROGRAM_ID, new (require("@coral-xyz/anchor").BorshCoder)(idl));
    const events = eventParser.parseLogs(tx.meta?.logMessages || []);

    for (const event of events) {
        if (event.name === "PurgeEvent") {
            console.log("✅ Found PurgeEvent!");
            console.log("Data:", event.data);

            const user = event.data.user;
            const amount = event.data.amount;
            const nonce = event.data.nonce;
            const recipientParam = event.data.dstAddress; // This is [u8; 32]

            // Convert recipient to hex string
            // address is 20 bytes, so take last 20 bytes of the 32 byte array?
            // Actually our event emits `dstAddress` which is the recipient.

            // Re-construct EVM address
            // const recipientHex = "0x" + Buffer.from(recipientParam as number[]).toString('hex').slice(24); // Last 20 bytes

            // For safety, let's just use the USER's EVM deployer address since we are testing
            const targetRecipient = "0x5364e0440e57f7401e64a89eec7ac7998373dda6";

            console.log(`Replaying for User: ${user.toString()}`);
            console.log(`Amount: ${amount.toString()}`);
            console.log(`Nonce: ${nonce.toString()}`);
            console.log(`Targeting EVM: ${targetRecipient}`);

            // EXECUTE BRIDGE
            const evmProvider = new ethers.JsonRpcProvider(BASE_RPC);
            const signer = new ethers.Wallet(PRIVATE_KEY, evmProvider);
            const purgeHub = new ethers.Contract(CORE_PURGE_HUB, PURGE_HUB_ABI, signer);

            const srcAddressBytes32 = "0x" + PROGRAM_ID.toBuffer().toString("hex").padEnd(64, '0');

            console.log("🚀 Sending Transaction to Base...");
            try {
                const tx = await purgeHub.receivePurge(
                    SOLANA_CHAIN_ID,
                    srcAddressBytes32,
                    targetRecipient,
                    BigInt(amount.toString()),
                    BigInt(nonce.toString())
                );
                console.log(`✅ Bridge TX Sent: ${tx.hash}`);
                await tx.wait();
                console.log("🎉 Confirmed!");
            } catch (e: any) {
                console.error("❌ Bridge Failed:", e);
                if (e.message.includes("execution reverted")) {
                    console.error("Check: Is Trading Open? Is Sender Trusted Peer?");
                }
            }
            return;
        }
    }
    console.log("⚠️ No PurgeEvent found in logs.");
}

main().catch(console.error);
