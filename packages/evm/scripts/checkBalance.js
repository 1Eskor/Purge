const { ethers, network } = require("hardhat");

async function main() {
    console.log("Checking network:", network.name);
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Account:", deployer.address);
        const balance = await ethers.provider.getBalance(deployer.address);
        console.log("Balance:", ethers.formatEther(balance), "ETH");
    } catch (e) {
        console.error("Connection failed:", e.message);
    }
}

main().catch(console.error);
