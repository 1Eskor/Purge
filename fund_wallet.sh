#!/bin/bash
export PATH="/home/yellow/.local/share/solana/install/active_release/bin:$PATH"
echo "Requesting airdrop..."
solana airdrop 1
solana balance
