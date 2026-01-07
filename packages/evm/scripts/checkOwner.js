
const { ethers } = require("hardhat");

async function main() {
    console.log("🔓 OPENING THE GATES...");

    // v3 Addresses
    const TOKEN_ADDRESS = "0xE4De7083042079040D9B180dCC8227b944209b42";
    const HUB_ADDRESS = "0xd8f6cE134E51c164395793B6c2Af932F4B5bD2DC";

    // Get Signer
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    // Attach Token
    const PurgeToken = await ethers.getContractFactory("PurgeToken");
    const token = PurgeToken.attach(TOKEN_ADDRESS);

    // Attach Hub
    const PurgeHub = await ethers.getContractFactory("PurgeHub");
    const hub = PurgeHub.attach(HUB_ADDRESS);

    // Check Ownership
    const tokenOwner = await token.owner();
    console.log("Token Owner:", tokenOwner);

    // The Hub is the Owner.
    // If we want to open gates, we have to call it via the Hub?
    // No, PurgeHub doesn't have an `openTheGates` pass-through function unless we added it.
    // Let's check PurgeHub.sol. 
    // If PurgeHub doesn't have it, and PurgeHub is the Owner, we are stuck!

    // WAIT! In deployMainnet.js we transferred ownership of Token -> Hub.
    // "await tokenContract.transferOwnership(hubAddr);"

    // If PurgeHub.sol does NOT have a function to call `token.openTheGates()`, we cannot open them!
    // And I suspect PurgeHub.sol does NOT have it because we didn't add it there.
    // We added it to PurgeToken.sol: "function openTheGates() external onlyOwner"

    // CRITICAL ISSUE: If Hub owns Token, and Hub can't call openTheGates, we are locked out forever.

    // UNLESS: We haven't transferred ownership yet?
    // The deployment log said: "Token ownership transferred".

    // FORCE-FIX:
    // We need to upgrade PurgeHub to add a function that calls token.openTheGates().
    // Luckily PurgeHub is upgradeable (UUPS/Transparent)!

    // PLAN B:
    // Maybe we didn't transfer ownership? 
    // If Token Owner is still Deployer, we can call it.

    // Let's check owner first.
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
