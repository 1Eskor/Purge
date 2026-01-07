#!/bin/bash
set -e

export PATH="$HOME/.foundry/bin:$PATH"
cd /mnt/c/Users/zachs/.gemini/antigravity/scratch/purge/packages/contracts

echo "Installing LayerZero-v2..."
# Remove --no-commit as it's deprecated/changed
forge install LayerZero-Labs/LayerZero-v2

echo "Done!"
