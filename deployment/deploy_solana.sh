#!/bin/bash
set -e

# 1. Setup Environment
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

echo "Using Solana: $(solana --version)"

# 2. Install Anchor if needed
echo "Configuring Anchor..."
if ! anchor --version | grep -q "0.29.0"; then
    echo "Installing Anchor 0.29.0 manually..."
    cargo install --git https://github.com/coral-xyz/anchor --tag v0.29.0 anchor-cli --locked --force
fi
echo "Using Anchor: $(anchor --version)"

# 3. Setup Wallet & Dependencies
mkdir -p ~/.config/solana
KEYPAIR="$HOME/.config/solana/id.json"
if [ ! -f "$KEYPAIR" ]; then
    echo "Creating new wallet..."
    # Ensure solana-keygen is found
    $HOME/.local/share/solana/install/active_release/bin/solana-keygen new --no-bip39-passphrase -o "$KEYPAIR" --force
fi

echo "Wallet Address: $(solana address)"
solana config set --url devnet

# 4. Airdrop
echo "Requesting Airdrop..."
for i in {1..5}; do
  solana airdrop 1 && break
  echo "Airdrop attempt $i failed, retrying in 5s..."
  sleep 5
done

# 5. Build & Sync Program ID
PROJECT_DIR="/mnt/c/Users/zachs/.gemini/antigravity/scratch/purge/packages/solana"
cd "$PROJECT_DIR"

echo "Pinning dependencies to avoid rustc issues..."
cd programs/purge
# Ensure Cargo.lock exists or create it
cargo generate-lockfile

# Downgrade borsh 1.6.0 which requires rustc 1.76
cargo update -p borsh:1.6.0 --precise 1.3.0 || echo "Borsh may already be compatible or failed"

# Downgrade proc-macro-crate to avoid toml_edit/indexmap issues (requires rustc 1.82)
cargo update -p proc-macro-crate --precise 3.0.0 || cargo update -p proc-macro-crate@3.4.0 --precise 3.0.0 || echo "proc-macro-crate downgrade failed"

# Downgrade indexmap to 2.2.6 (compatible with rustc 1.63+)
cargo update -p indexmap@2.12.1 --precise 2.2.6 || echo "Indexmap downgrade failed"

cd ../..

echo "Building project to generate keypair..."
anchor build

# Force SBF build to ensure .so exists (anchor build seemingly skipped it)
echo "Forcing SBF build..."
mkdir -p target/deploy
cd programs/purge
cargo build-sbf --manifest-path Cargo.toml --sbf-out-dir ../../target/deploy
cd ../..

# Ensure keypair exists
PROGRAM_KEYPAIR="target/deploy/purge-keypair.json"
if [ ! -f "$PROGRAM_KEYPAIR" ]; then
    echo "Generating program keypair manually..."
    mkdir -p target/deploy
    $HOME/.local/share/solana/install/active_release/bin/solana-keygen new --no-bip39-passphrase -o "$PROGRAM_KEYPAIR" --force
fi

# Get the generated Program ID
PROGRAM_ID=$(solana address -k "$PROGRAM_KEYPAIR")
echo "Generated Program ID: $PROGRAM_ID"

# Update lib.rs
echo "Updating declare_id! in lib.rs..."
sed -i "s/declare_id!(\".*\");/declare_id!(\"$PROGRAM_ID\");/" programs/purge/src/lib.rs

# Update Anchor.toml
echo "Updating Anchor.toml..."
sed -i "s/purge = \".*\"/purge = \"$PROGRAM_ID\"/" Anchor.toml

# Rebuild with new ID
echo "Rebuilding with correct Program ID..."
anchor build

# 6. Deploy
echo "Deploying to Devnet..."
anchor deploy

echo "✅ Deployment Complete!"
echo "Program ID: $PROGRAM_ID"
