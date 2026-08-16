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

## Deploying

Wallets come from forge's CLI flags, never from env or code.

```sh
cd contracts
# Testnet 46630 (deploys a MockUSDG when USDG is unset; treasury/pool default to the sender)
forge script script/DeployClam.s.sol --rpc-url robinhood_testnet --broadcast \
  --private-key 0x... \
  --verify --verifier blockscout --verifier-url https://explorer.testnet.chain.robinhood.com/api/

# Mainnet 4663 (Trezor; USDG must be canonical, TREASURY and PRIZE_POOL required)
USDG=0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168 TREASURY=0x... PRIZE_POOL=0x... \
forge script script/DeployClam.s.sol --rpc-url robinhood --broadcast --trezor --sender 0x... \
  --verify --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api/
```

Each deploy writes `contracts/deployments/<chainId>.json`; run `npm run sync-abis` after `forge build` to refresh `packages/sdk` ABIs, and copy new addresses into `packages/sdk/src/addresses.ts`.

## Web app

```sh
npm run dev -w @pearlstreet/web   # http://localhost:3100  (proof of reserve, vault wrap/redeem)
```

Robinhood Chain notes that bite: chain IDs are 4663 (mainnet) and 46630 (testnet); use timestamps or `ArbSys(0x64).arbBlockNumber()`, never `block.number`; randomness is commit-reveal (no VRF); the sequencer can silently drop screened transactions, so verify inclusion on Blockscout rather than assuming it.
The full list lives in `docs/reference/ROBINHOOD-CHAIN.md`.
