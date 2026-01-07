# Purge Protocol

A chain-agnostic "liquidity black hole" with a Hub-and-Spoke architecture.

## Structure

- `packages/evm`: Hardhat project for the Hub (Base) and EVM Spokes.
- `packages/solana`: Anchor project for the Solana Spoke.
- `packages/frontend`: Next.js web application.

## Setup

### EVs (Hub & Spokes)
1. Navigate to `packages/evm`.
2. Run `npm install` (Note: LayerZero packages may require manual resolution if registry issues persist).
3. Set `.env` with `PRIVATE_KEY` and `LZ_ENDPOINT` addresses.

### Solana
1. Navigate to `packages/solana`.
2. Ensure Anchor is installed.
3. Run `anchor build`.

### Frontend
1. Navigate to `packages/frontend`.
2. Run `npm run dev`.
