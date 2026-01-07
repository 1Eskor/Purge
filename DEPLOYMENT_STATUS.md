# Purge Protocol - Deployment Verification

## Status: 🟢 OPERATIONAL

### 1. Solana (Devnet)
- **Program ID:** `EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re`
- **Config PDA:** `36aPZtn7Yd7qY5GmDiNTEeKFPHHHJV9wQS7dY2FekEYM`
- **USDC Vault:** `6UrCdRcfrT6xE3iPJu3yEfhLnBJswrPT3xe9vGvss6de`

### 2. Base Sepolia (L2)
- **PRG Token:** `0x5c39612259941648ddbd022689f9d891699177cc`
- **PurgeHub (Core):** `0x16f97aab49ec1969ff520ddda64f2e3870856a0f`
- **PurgeHubLZ (OApp):** `0xb39109c9d31fedf3ed8e32dc8139b48a1ae5a6b1`
- **Relayer Wallet:** `0x5364e0440e57F7401e64A89eEC7aC7998373Dda6`

### 3. Integration Checks
- **Frontend:** Patched to support Devnet USDC masquerading.
- **Relayer:** Running and listening on `EB2...`.
- **Security:** `PurgeHub` Trusted Peer updated to `0xc3b9...` (Solana Program).

### How to Demo
1. Connect Solana Wallet (Devnet).
2. Select USDC.
3. Purge 1 USDC.
4. Watch Relayer console for "Bridge Complete!".
5. Check Base Wallet (`0x5364...`) for +0.9 PRG.
