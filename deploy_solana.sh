#!/bin/bash
set -e
export PATH="/home/yellow/.cargo/bin:$PATH"
export PATH="/home/yellow/.local/share/solana/install/active_release/bin:$PATH"

cd /mnt/c/Users/zachs/.gemini/antigravity/scratch/purge/packages/solana

echo "Building Solana program..."
anchor build

echo "Deploying to Devnet..."
anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/id.json

echo "Done!"
