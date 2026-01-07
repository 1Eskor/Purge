#!/bin/bash
set -e

export PATH="$HOME/.foundry/bin:$PATH"
export PRIVATE_KEY=0xfe1419000a2dfc17b972e6cd66ee37d7eb9ae536d72303b138d215c45858e46b

# PurgeHub address on Base Sepolia
PURGE_HUB="0x16f97aab49ec1969ff520ddda64f2e3870856a0f"
# Your wallet address
RECIPIENT="0x5364e0440e57F7401e64A89eEC7aC7998373Dda6"
# Amount: 100 USDC worth (100 * 10^6 = 100000000)
USDC_AMOUNT="100000000"

echo "Calling simulatePurge on PurgeHub..."
echo "Recipient: $RECIPIENT"
echo "USDC Amount: $USDC_AMOUNT (100 USDC)"
echo "Expected PRG: 90 PRG (100 * 0.9)"
echo ""

cast send $PURGE_HUB \
    "simulatePurge(address,uint256)" \
    $RECIPIENT \
    $USDC_AMOUNT \
    --rpc-url https://sepolia.base.org \
    --private-key $PRIVATE_KEY

echo ""
echo "Done! Check your wallet for PRG tokens."
echo "PRG Token: 0x5c39612259941648ddbd022689f9d891699177cc"
