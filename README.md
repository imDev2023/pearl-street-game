# Pearl Street

The market never sleeps under the sea.

Pearl Street is an idle creature game on Robinhood Chain: send parties of undersea creatures on trading voyages keyed to real stock tickers, with outcomes driven by live Chainlink price feeds.

- Product spec: `docs/PRD.md`
- Economy design: `docs/TOKENOMICS.md`
- Work queue: `docs/tickets/README.md`
- Chain reference: `docs/reference/ROBINHOOD-CHAIN.md`
- Agent/session context: `CLAUDE.md`

## Workspaces

- `contracts/` Solidity (Foundry)
- `apps/web/` game client (placeholder)
- `apps/indexer/` event indexer and leaderboard API (placeholder)
- `packages/sdk/` shared constants, addresses, and the Chainlink feed registry
- `website/` static pre-sale site and whitepaper

## Getting started

Prerequisites: Node 24+ and Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`).

```sh
# Contracts
cd contracts
test -d lib/forge-std/src || forge install foundry-rs/forge-std
forge build
forge test

# SDK and workspaces (from the repo root)
npm install
npm test
```

## Deploying to testnet

```sh
cd contracts
export PRIVATE_KEY=0x...   # never commit keys
forge script script/DeployHarborBell.s.sol \
  --rpc-url robinhood_testnet --broadcast \
  --verify --verifier blockscout \
  --verifier-url https://explorer.testnet.chain.robinhood.com/api/
```

Robinhood Chain notes that bite: chain IDs are 4663 (mainnet) and 46630 (testnet); use timestamps or `ArbSys(0x64).arbBlockNumber()`, never `block.number`; randomness is commit-reveal (no VRF); the sequencer can silently drop screened transactions, so verify inclusion on Blockscout rather than assuming it.
The full list lives in `docs/reference/ROBINHOOD-CHAIN.md`.
