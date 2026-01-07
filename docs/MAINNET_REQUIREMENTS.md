# Purge Protocol: Mainnet Deployment Requirements

## Current Status (Updated)

✅ **Testnet Deployed (Base Sepolia)**
- PurgeToken: `0x74fca916654808Eb15F2A24311134d6c4F72544d`
- PurgeHub: `0xa051EC518Db06f098d452A3F33983A23C87967BE`

---

## 🔴 Critical: Smart Contract Gaps

### 1. LayerZero Integration (PurgeHub) ✅ COMPLETE

- [x] Inherits `OAppReceiverUpgradeable` from LayerZero
- [x] Implements `_lzReceive()` for cross-chain message handling
- [x] Validates spoke via `allowedSpokeEids` mapping

### 2. LayerZero Integration (PurgeSpoke) ✅ COMPLETE

- [x] Inherits `OAppSender` from LayerZero
- [x] Implements `_lzSend()` via `_sendPurgeMessage()`
- [x] Fee estimation via `quotePurge()`

### 3. Access Control & Security ✅ MOSTLY COMPLETE

| Contract | Status | Notes |
|----------|--------|-------|
| `PurgeHub._lzReceive()` | ✅ | Protected by OAppReceiver |
| `PurgeToken.mint()` | ✅ | Protected by `onlyOwner` |

---

## 🟠 High Priority: Infrastructure Integration

### 4. DEX Aggregator Integration ✅ COMPLETE

- [x] `PurgeSpoke` accepts pre-built swap calldata from 1inch API
- [x] Added `Pausable` for emergency stop
- [x] Added `SwapExecuted` event for tracking
- [x] Added max slippage validation (10% cap)

### 5. Price Oracles (Pyth Network) ✅ COMPLETE

- [x] Installed `@pythnetwork/pyth-sdk-solidity`
- [x] Created `PythPriceHelper.sol` library
- [x] Added common price feed IDs

### 6. Reflections Distribution System ✅ COMPLETE

- [x] Scalable Dividend Algorithm in PurgeToken
- [x] Hybrid reward model (Seniority + Global split)
- [x] Anti-flash-loan protection

---

## 🟡 Medium Priority: Governance & Operations

### 7. DAO Governance (Snapshot + Tally) ⬜ TODO

- [ ] Deploy Snapshot space for off-chain voting
- [ ] Configure Tally for on-chain execution
- [ ] Define proposal thresholds and quorum

### 8. Multi-Sig & Admin Controls ⬜ TODO

- [ ] Deploy Gnosis Safe for Treasury wallet
- [ ] Deploy Gnosis Safe for LP wallet
- [ ] Transfer `PurgeHub` ownership to multi-sig

---

## 🟢 Deployment: Chain-Specific Tasks

### Hub Chain (Base Mainnet)

| Task | Status |
|------|--------|
| Deploy Contracts (UUPS Proxy) | ✅ Testnet Done |
| Transfer Token ownership to Hub | ✅ Testnet Done |
| Verify contracts on BaseScan | ⬜ TODO |
| Set up LZ peers for all spokes | ⬜ TODO |

### Spoke Chains

| Chain | LZ Endpoint ID | Status |
|-------|----------------|--------|
| Ethereum | 30101 | ⬜ TODO |
| Arbitrum | 30110 | ⬜ TODO |
| Optimism | 30111 | ⬜ TODO |

---

## 🔐 Security Checklist

- [ ] Professional audit
- [ ] Bug bounty program
- [x] Reentrancy protection
- [ ] Pausable functionality

---

## Immediate Next Steps

1. Deploy to Base Mainnet (requires ETH)
2. Set up Gnosis Safe multi-sigs
3. Configure Snapshot DAO space
4. Security audit before public launch
