# Purge Protocol: Mainnet Deployment Checklist

## Current Status (Updated)

✅ **Testnet Deployed (Base Sepolia)**
- PurgeToken: `0x74fca916654808Eb15F2A24311134d6c4F72544d`
- PurgeHub: `0xa051EC518Db06f098d452A3F33983A23C87967BE`

---

## 🔴 Critical: Smart Contract Gaps

### 1. LayerZero Integration (PurgeHub) ✅ COMPLETE

**Status:** Implemented during UUPS refactor.

- [x] Inherits `OAppReceiverUpgradeable` from LayerZero
- [x] Implements `_lzReceive()` for cross-chain message handling
- [x] Validates spoke via `allowedSpokeEids` mapping
- [x] Decodes message and processes purge with tax distribution

---

### 2. LayerZero Integration (PurgeSpoke) ✅ COMPLETE

**Status:** Already implemented with full OApp integration.

- [x] Inherits `OAppSender` from LayerZero
- [x] Implements `_lzSend()` via `_sendPurgeMessage()`
- [x] Fee estimation via `quotePurge()`
- [x] Handles `msg.value` for LayerZero gas fees
- [x] Refunds excess ETH to user

---

### 3. Access Control & Security ✅ MOSTLY COMPLETE

| Contract | Status | Notes |
|----------|--------|-------|
| `PurgeHub._lzReceive()` | ✅ | Protected by `OAppReceiver` (only LZ Endpoint can call) |
| `PurgeHub.processPurge()` | ⚠️ | Legacy function exposed; consider removing or adding access control |
| `PurgeSpoke.purge()` | ⚠️ | Raw `router.call(_swapData)` needs validation |
| `PurgeToken.mint()` | ✅ | Protected by `onlyOwner` (Hub owns Token) |

---

## 🟠 High Priority: Infrastructure Integration

### 4. DEX Aggregator Integration (1inch / KyberSwap) ✅ COMPLETE

**Status:** Implemented with raw calldata approach (industry standard).

- [x] `PurgeSpoke` accepts pre-built swap calldata from 1inch API
- [x] Added `Pausable` for emergency stop
- [x] Added `SwapExecuted` event for tracking
- [x] Added max slippage validation (10% cap)
- [x] Created `MockDEXRouter` for local testing
- [x] Created mainnet fork test scripts

---

### 5. Price Oracles (Pyth Network) ✅ COMPLETE

**Status:** Implemented with pull oracle model.

- [x] Installed `@pythnetwork/pyth-sdk-solidity`
- [x] Created `PythPriceHelper.sol` library
- [x] Added common price feed IDs (ETH, BTC, USDC, USDT, LINK, UNI, AAVE, SHIB, DOGE)
- [x] Implemented USD value calculation with proper decimal handling

---

### 6. Reflections Distribution System ✅ COMPLETE

**Status:** Implemented during tokenomics phase.

- [x] Scalable Dividend Algorithm in PurgeToken
- [x] `distributeDividends()` and `claimReward()` functions
- [x] Hybrid reward model (Seniority + Global split)
- [x] Anti-flash-loan protection with block-sync

---

## 🟡 Medium Priority: Governance & Operations

### 7. DAO Governance (Snapshot + Tally) ⬜ TODO

- [ ] Deploy Snapshot space for off-chain voting
- [ ] Configure Tally for on-chain execution
- [ ] Define proposal thresholds and quorum

---

### 8. Multi-Sig & Admin Controls ⬜ TODO

- [ ] Deploy Gnosis Safe for Treasury wallet
- [ ] Deploy Gnosis Safe for LP wallet
- [ ] Transfer `PurgeHub` ownership to multi-sig
- [ ] Define timelocks for critical operations

---

## 🟢 Deployment: Chain-Specific Tasks

### Hub Chain (Base Mainnet)

| Task | Status |
|------|--------|
| Deploy Contracts (UUPS Proxy) | ✅ Testnet Done |
| Transfer Token ownership to Hub | ✅ Testnet Done |
| Verify contracts on BaseScan | ⬜ TODO |
| Set up LZ peers for all spokes | ⬜ TODO |
| Fund with real ETH | ⬜ TODO |

### Spoke Chains

| Chain | LZ Endpoint ID | Status |
|-------|----------------|--------|
| Ethereum | 30101 | ⬜ TODO |
| Arbitrum | 30110 | ⬜ TODO |
| Optimism | 30111 | ⬜ TODO |
| Polygon | 30109 | ⬜ TODO |
| BNB Chain | 30102 | ⬜ TODO |
| Solana | 30168 | ⬜ TODO (Anchor program) |

---

## 🔐 Security Checklist

- [ ] Professional audit (Quantstamp, Trail of Bits, etc.)
- [ ] Bug bounty program (Immunefi)
- [ ] Formal verification of tax math
- [x] Reentrancy protection on all external calls
- [ ] Pausable functionality for emergencies
- [ ] Rate limiting on minting

---

## 📊 Remaining Work Summary

| Category | Items Remaining |
|----------|-----------------|
| **Critical** | PurgeSpoke LZ integration |
| **High** | DEX Aggregator, Price Oracle |
| **Medium** | DAO Governance, Multi-Sig |
| **Deployment** | Mainnet contracts, Spoke chains |
| **Security** | Audit, Bug Bounty |

---

## Immediate Next Steps

1. **Complete PurgeSpoke OApp Integration** - Enable cross-chain messaging from spoke chains
2. **Integrate 1inch for Swaps** - Replace raw router call with validated aggregation
3. **Add Pyth Oracle** - Accurate USD pricing for minting
4. **Contract Verification** - Verify testnet contracts on BaseScan
5. **Security Review** - Internal review before audit engagement
