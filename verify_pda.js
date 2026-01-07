const { PublicKey } = require("@solana/web3.js");

const PROGRAM_ID = new PublicKey("EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re");
const [pda, bump] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);

console.log("Expected Config PDA:", pda.toBase58());
console.log("Bump:", bump);
