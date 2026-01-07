#!/bin/bash
set -e

export PATH="$HOME/.foundry/bin:$PATH"

cd /mnt/c/Users/zachs/.gemini/antigravity/scratch/purge/packages/contracts

echo "=== Setting up Foundry project ==="

# Remove old lib folder and reinitialize
rm -rf lib
mkdir -p lib

# Initialize git if not already
git init 2>/dev/null || true
git config user.email "deploy@purge.local" 2>/dev/null || true
git config user.name "Deploy" 2>/dev/null || true

# Install OpenZeppelin using forge
echo "Installing OpenZeppelin..."
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0

# Install forge-std
echo "Installing forge-std..."
forge install foundry-rs/forge-std

echo ""
echo "=== Building contracts ==="
forge build

echo ""
echo "=== Build complete! ==="
