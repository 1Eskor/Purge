const { PublicKey } = require("@solana/web3.js");
const pid = new PublicKey("EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re");
console.log(pid.toBuffer().toString("hex"));
