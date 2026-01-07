#!/bin/bash
set -e
export PATH="/home/yellow/.cargo/bin:$PATH"
export PATH="/home/yellow/.local/share/solana/install/active_release/bin:$PATH"

cd /mnt/c/Users/zachs/.gemini/antigravity/scratch/purge/packages/solana
echo "Building Solana program (for IDL)..."
anchor build
