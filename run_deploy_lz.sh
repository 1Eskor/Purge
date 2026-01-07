#!/bin/bash
set -e

export PATH="$HOME/.foundry/bin:$PATH"
export PRIVATE_KEY=0xfe1419000a2dfc17b972e6cd66ee37d7eb9ae536d72303b138d215c45858e46b

cd /mnt/c/Users/zachs/.gemini/antigravity/scratch/purge/packages/contracts

echo "Deploying PurgeHubLZ to Base Sepolia..."

forge script script/DeployLZ.s.sol:DeployLZ \
    --rpc-url https://sepolia.base.org \
    --broadcast \
    -vvvv

echo "Done!"
