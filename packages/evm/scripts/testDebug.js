const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    const MockEndpoint = await hre.ethers.getContractFactory("MockEndpointV2");
    const mockEndpoint = await MockEndpoint.deploy();
    const endpointAddr = await mockEndpoint.getAddress();

    const PurgeToken = await hre.ethers.getContractFactory("PurgeToken");
    const purgeToken = await PurgeToken.deploy("Purge", "PRG", endpointAddr, deployer.address);
    await purgeToken.waitForDeployment();

    console.log("Initial Supply:", await purgeToken.totalSupply());

    // Simulate Bootstrap Logic
    console.log("Minting 1000 to Deployer...");
    await purgeToken.mint(deployer.address, hre.ethers.parseEther("1000"));

    const supply = await purgeToken.totalSupply();
    console.log("Supply After Mint:", hre.ethers.formatEther(supply));

    console.log("Distributing 10 Tokens...");
    // Mint to contract first (simulating Hub logic)
    await purgeToken.mint(await purgeToken.getAddress(), hre.ethers.parseEther("10"));

    await purgeToken.distributeDividends(hre.ethers.parseEther("10"));
    console.log("Distribution Success.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
