# Solana Setup Guide for Windows Users

Since you are running on Windows without the Rust/Solana Tool Suite installed, you can skip local compilation for now and use the `Mock IDL` (`purge_idl.json`) for frontend development.

When you are ready to deploy the `PurgeSpoke` program to Devnet or Mainnet, follow these steps:

## 1. Install WSL (Windows Subsystem for Linux)
Solana tools work best in a Linux environment.
```powershell
wsl --install
# Restart your computer if prompted
```

## 2. Install Rust & Solana (Inside WSL)
Open your WSL terminal (Ubuntu) and run:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"
export PATH="/home/yourusername/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

## 3. Build & Deploy
Navigate to the project folder (you can access Windows files from WSL via `/mnt/c/Users/...`):

```bash
cd /mnt/c/Users/zachs/.gemini/antigravity/scratch/purge/packages/solana
anchor build
anchor deploy --provider.cluster devnet
```

## 4. Updates
After deployment, `anchor build` will generate a new `target/idl/purge.json`.
Copy this file to `packages/frontend/lib/purge_idl.json` to keep your frontend in sync with the real contract.
