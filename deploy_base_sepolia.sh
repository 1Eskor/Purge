#!/bin/bash
# Deploy Purge contracts to Base Sepolia

set -e

export PATH="$HOME/.foundry/bin:$PATH"

echo "========================================="
echo "   PURGE CONTRACTS DEPLOYMENT SCRIPT     "
echo "   Target: Base Sepolia Testnet          "
echo "========================================="

# Check for private key
if [ -z "$PRIVATE_KEY" ]; then
    echo ""
    echo "ERROR: PRIVATE_KEY environment variable not set!"
    echo ""
    echo "Please run:"
    echo "  export PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE"
    echo ""
    echo "Then run this script again."
    exit 1
fi

cd /mnt/c/Users/zachs/.gemini/antigravity/scratch/purge/packages/contracts

echo ""
echo "Deploying to Base Sepolia..."
echo "Using RPC: https://sepolia.base.org"
echo ""

# Deploy with broadcast
forge script script/Deploy.s.sol:DeployPurge \
    --rpc-url https://sepolia.base.org \
    --broadcast \
    -vvvv

echo ""
echo "========================================="
echo "   Deployment Complete!                  "
echo "========================================="
