# Purge Protocol Architecture

## Overview

Purge Protocol is a cross-chain token burning mechanism that allows users to "purge" (sacrifice) their tokens on any supported chain and receive PRG tokens on Base L2.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              PURGE PROTOCOL ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

                            ┌─────────────────────────┐
                            │       USER WALLET        │
                            │   (Phantom / MetaMask)   │
                            └───────────┬─────────────┘
                                        │
                                        │ Deposits SOL/USDC/Any Token
                                        ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                                   FRONTEND (Next.js)                                  │
│  ┌────────────────────────────────────────────────────────────────────────────────┐  │
│  │  • Token Selection (SOL, USDC, BONK, etc.)                                     │  │
│  │  • Amount Input with USD value calculation                                     │  │
│  │  • Jupiter Quote Preview (if swap needed)                                      │  │
│  │  • PRG Amount Preview (amount × 0.9)                                           │  │
│  │  • Chain Selection (Solana, Base, Ethereum, etc.)                              │  │
│  └────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
    ┌───────────────────────────────┐       ┌───────────────────────────────┐
    │    SOLANA SPOKE               │       │    EVM SPOKE (Future)         │
    │    (Anchor Program)           │       │    (Solidity Contract)        │
    │                               │       │                               │
    │  1. If not USDC:              │       │  1. Accept ERC20 tokens       │
    │     → Jupiter Swap to USDC    │       │  2. Swap via DEX if needed    │
    │  2. Lock USDC in Vault        │       │  3. Lock/Burn tokens          │
    │  3. Emit PurgeEvent           │       │  4. Send LZ message           │
    │                               │       │                               │
    │  Program ID:                  │       │  Contract: (Not deployed)     │
    │  EB2wT2NmDps...               │       │                               │
    └───────────────┬───────────────┘       └───────────────┬───────────────┘
                    │                                       │
                    │         LayerZero Message             │
                    └───────────────────┬───────────────────┘
                                        │
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────────────┐
    │                           LAYERZERO PROTOCOL                                  │
    │                                                                               │
    │    • Validates source chain message                                           │
    │    • Routes to destination chain                                              │
    │    • Ensures message integrity                                                │
    │                                                                               │
    │    Solana EID: 40168 (Devnet)                                                 │
    │    Base EID: 30184                                                            │
    └───────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────────────┐
    │                          PURGE HUB (Base L2)                                  │
    │                                                                               │
    │    PurgeHub.sol                                                               │
    │    ├── receivePurge(srcChain, srcAddr, recipient, amount, nonce)              │
    │    │   • Verify source is trusted peer                                        │
    │    │   • Check nonce not replayed                                             │
    │    │   • Calculate PRG amount (USDC × 0.9)                                    │
    │    │   • Call PRGToken.mint(recipient, amount)                                │
    │    │                                                                          │
    │    └── simulatePurge(recipient, amount) [Owner only - for testing]            │
    │                                                                               │
    │    PRGToken.sol (ERC-20)                                                      │
    │    ├── mint(to, amount) [Only PurgeHub]                                       │
    │    ├── burn(amount)                                                           │
    │    └── Standard ERC-20 functions                                              │
    │                                                                               │
    │    Contract Addresses: (Deploy to Base Sepolia)                               │
    │    • PRGToken: TBD                                                            │
    │    • PurgeHub: TBD                                                            │
    └───────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                            ┌─────────────────────────┐
                            │     USER RECEIVES       │
                            │      PRG TOKENS         │
                            │    (on Base L2)         │
                            └─────────────────────────┘


## Token Economics

┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN FLOW & ECONOMICS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Deposits: $100 USDC worth of tokens                       │
│                                                                 │
│  ┌────────────────────────────────────────┐                     │
│  │         USDC Locked in Vault           │                     │
│  │              $100.00                   │                     │
│  └────────────────────────────────────────┘                     │
│                     │                                           │
│          ┌──────────┴──────────┐                                │
│          │                     │                                │
│          ▼                     ▼                                │
│  ┌───────────────┐     ┌───────────────┐                        │
│  │  User Gets    │     │  LP Pool      │                        │
│  │  90 PRG       │     │  10 PRG       │                        │
│  │  (90%)        │     │  (10%)        │                        │
│  └───────────────┘     └───────────────┘                        │
│                                                                 │
│  PRG Token Properties:                                          │
│  • Mintable only through purge mechanism                        │
│  • 18 decimals (standard ERC-20)                                │
│  • Burnable (users can burn their PRG)                          │
│  • No max supply (inflationary based on deposits)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


## Deployed Contracts & Addresses

### Solana Devnet
| Component | Address |
|-----------|---------|
| Purge Program | `EB2wT2NmDpscd5PRQnVNnidQzHU9QGAEKA4u6NjVx6Re` |
| Config PDA | `36aPZtn7Yd7qY5GmDiNTEeKFPHHHJV9wQS7dY2FekEYM` |
| USDC Vault | `6UrCdRcfrT6xE3iPJu3yEfhLnBJswrPT3xe9vGvss6de` |
| Admin | `CzdSdctKiZ5E9uymrUTq1RnWBp7JEmMAN8BQiurMR1up` |

### Base Sepolia (DEPLOYED)
| Component | Address |
|-----------|---------|
| PRGToken | `0x5c39612259941648ddbd022689f9d891699177cc` |
| PurgeHub | `0x16f97aab49ec1969ff520ddda64f2e3870856a0f` |
| Treasury | `0x5364e0440e57F7401e64A89eEC7aC7998373Dda6` |


## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| ✅ Accept USDC deposits | **Working** | Solana Devnet |
| ✅ Jupiter swap integration | **Code Ready** | Mainnet only (Jupiter doesn't support Devnet) |
| ✅ Lock USDC in vault | **Working** | Config + Vault PDAs |
| ✅ Emit PurgeEvent | **Working** | On-chain events |
| ✅ PRG Token contract | **Deployed** | Base Sepolia |
| ✅ PurgeHub contract | **Deployed** | Base Sepolia |
| ⏳ LayerZero integration | **Placeholder** | Requires OApp setup |
| ⏳ Cross-chain messaging | **Manual relayer ready** | Can test with simulatePurge() |
| ❌ Mainnet deployment | **Not started** | After testing |


## Security Considerations

1. **Replay Protection**: Nonce tracking per source chain
2. **Trusted Peers**: Only accepts messages from verified source programs
3. **Reentrancy Guard**: On all state-changing functions
4. **Access Control**: Owner-only admin functions
5. **Slippage Protection**: Jupiter swaps have configurable slippage


## How It Works (Step by Step)

### 1. User Deposits SOL on Solana
```
User → Frontend → Jupiter Swap (SOL→USDC) → Purge Program → USDC locked in Vault
                                                         → PurgeEvent emitted
```

### 2. Cross-Chain Message (Future)
```
PurgeEvent → LayerZero Relayer → Validates → Routes to Base
```

### 3. PRG Minting on Base
```
LayerZero → PurgeHub.receivePurge() → PRGToken.mint() → User receives PRG
```


## Development Commands

```bash
# Frontend
cd packages/frontend
npm run dev

# Solana Program (WSL)
cd packages/solana
anchor build
anchor deploy

# Base Contracts
cd packages/contracts
forge build
forge test
forge script script/Deploy.s.sol --broadcast
```
