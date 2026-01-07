#!/bin/bash
# Deploy Purge contracts to Base Sepolia testnet

set -e

echo "========================================="
echo "   PURGE CONTRACTS DEPLOYMENT SCRIPT     "
echo "   Target: Base Sepolia Testnet          "
echo "========================================="

# Check for required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable not set"
    echo "Export your deployer private key: export PRIVATE_KEY=0x..."
    exit 1
fi

# Set RPC URL (Base Sepolia public RPC)
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"

cd "$(dirname "$0")/../packages/contracts"

echo ""
echo "Installing dependencies..."

# Install Foundry if not installed
if ! command -v forge &> /dev/null; then
    echo "Foundry not found. Installing..."
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc
    foundryup
fi

# Install OpenZeppelin contracts
echo "Installing OpenZeppelin..."
forge install OpenZeppelin/openzeppelin-contracts --no-commit 2>/dev/null || true

# Install forge-std
echo "Installing forge-std..."
forge install foundry-rs/forge-std --no-commit 2>/dev/null || true

echo ""
echo "Building contracts..."
forge build

echo ""
echo "Deploying to Base Sepolia..."
forge script script/Deploy.s.sol:DeployPurge \
    --rpc-url $BASE_SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    -vvvv

echo ""
echo "========================================="
echo "   Deployment Complete!                  "
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Save the contract addresses from above"
echo "2. Update the frontend with the PurgeHub address"
echo "3. Fund the deployer on Base Sepolia for gas"
echo "4. Test with simulatePurge() function"
