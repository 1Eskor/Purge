# Purge Protocol - Mainnet Readiness Roadmap

## ✅ Accomplished Today (Devnet Alpha)
We successfully built and validated the core "Purge" loop from Solana to Base L2.

1.  **Cross-Chain Architecture Implemented**
    *   **Solana:** Deployed `Purge` program (Devnet) that burns USDC and emits events.
    *   **Base:** Deployed `PurgeHub` and `PRGToken` (Sepolia) utilizing LayerZero patterns.
    *   **Bridge:** Created a custom Node.js Relayer to listen/sign/forward messages.

2.  **Frontend Integration**
    *   Connected to Solana Devnet.
    *   Integrated Jupiter capability (with Devnet fallback patches).
    *   Successfully executed `purge()` instruction from UI.

3.  **Security Validation**
    *   Configured **Trusted Peers** (Solana Program ID <-> Base Contract) to preventing unauthorized minting.
    *   Verified end-to-end integration: User purges on Solana -> Relayer detects -> Base mints PRG.

---

## 📋 Mainnet Release Checklist

### 1. Smart Contracts (Base Mainnet)
- [ ] **Deploy Contracts**: Deploy `PRGToken`, `PurgeHub`, `PurgeHubLZ` to Base Mainnet.
- [ ] **Verify Source**: Verify all contracts on Basscan.
- [ ] **Set Trusted Peer**: Call `setTrustedPeer` on Base with the **Solana Mainnet Program ID**.
- [ ] **Transfer Ownership**: Transfer contract ownership to a multi-sig (Safe) for security.
- [ ] **Liquidity (Optional)**: Seed a PRG/USDC pool on a DEX (Aerodrome). 
    *   *Note: Since you have limited capital, you can rely on a **"Fair Launch"**: The first users who mint PRG via the bridge can create the trading pool themselves. You do not strictly need to provide the funds.*

### 2. Solana Program (Mainnet Beta)
- [ ] **Deploy Program**: Deploy the verified build to Solana Mainnet.
- [ ] **Initialize Config**: Run `initialize` with the Mainnet USDC Mint (`EPjFW...`) and LayerZero Endpoint ID (30184 for Base).
- [ ] **Config Authority**: secure the upgrade authority keypair (Squads v4 recommended).

### 3. Relayer Infrastructure (Production)
- [ ] **Hosting**: Deploy the Relayer Bot to a reliable cloud provider (AWS EC2, DigitalOcean, or Render). Do not run on local laptop.
- [ ] **RPC Providers**: Use paid/reliable RPC endpoints for Solana (Helius/Triton) and Base (Alchemy/Infura) to avoid rate limits and missed events.
- [ ] **Wallet Security**:
    - Use a dedicated Relayer Wallet (hot wallet) with limited ETH for gas.
    - **Do NOT** use the Contract Owner wallet as the Relayer.
    - Use a Secrets Manager (AWS KMS / Infisical) for Private Keys.
- [ ] **Monitoring**: Add logging/alerting (Sentry/Slack) if the Relayer crashes or runs out of ETH.

### 4. Frontend (Production)
- [x] **Network Config**: Set `NEXT_PUBLIC_SOLANA_NETWORK=mainnet` in Vercel/Netlify.
- [x] **Address Update**: Update `constants.ts` with the new Mainnet Program IDs and Contract Addresses.
- [x] **Production URL**: `https://frontend-61k9k3l1o-zachs-projects-20fde1b6.vercel.app/`
- [x] **Domain**: `purgecrypto.xyz`

### 5. Final Audit
- [ ] **Gas Check**: Ensure Relayer has enough ETH on Base for expected transaction volume.
- [ ] **Limit Check**: Consider adding a temporary `maxAmount` limit in the contracts for the initial launch phase to reduce risk.

---

## 🏗️ Current Deployed Addresses (Devnet / Sepolia)

**Solana Devnet**
- **Program ID**: `EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re`
- **Config PDA**: `36aPZtn7Yd7qY5GmDiNTEeKFPHHHJV9wQS7dY2FekEYM`
- **USDC Vault**: `6UrCdRcfrT6xE3iPJu3yEfhLnBJswrPT3xe9vGvss6de`

**Base Sepolia (L2) [UPDATED - v3 Anti-Bot + v2 Tax - VERIFIED]**
- **PRG Token**: `0xE4De7083042079040D9B180dCC8227b944209b42`
- **PurgeHub (Core)**: `0xd8f6cE134E51c164395793B6c2Af932F4B5bD2DC`
- **PurgeHubLZ (OApp)**: `0xd8f6cE134E51c164395793B6c2Af932F4B5bD2DC` (Same as Hub)
- **Deployer/Relayer**: `0x5364e0440e57F7401e64A89eEC7aC7998373Dda6`


