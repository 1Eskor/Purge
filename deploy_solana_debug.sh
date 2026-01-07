#!/bin/bash
set -e
export PATH="/home/yellow/.cargo/bin:$PATH"
export PATH="/home/yellow/.local/share/solana/install/active_release/bin:$PATH"
export RUST_BACKTRACE=1

cd /mnt/c/Users/zachs/.gemini/antigravity/scratch/purge/packages/solana

echo "Deploying to Devnet with debug..."
anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/id.json
