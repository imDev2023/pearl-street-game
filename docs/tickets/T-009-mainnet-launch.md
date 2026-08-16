# T-009: Mainnet launch

Status: ready
Blocked by: T-008

## What to build

Feature 1 live on chain 4663 with monitoring, and the marketing assets that depend on live contracts, executed as the decided launch sequence (`docs/ARCHITECTURE.md`): Gen-0 sale from our site, three to four days of live game with the marketplace open, PEARL pre-sale, locked PEARL/USDG V3 pool from 75% of proceeds, claims open on the site.

Deploy scripts with verified contracts, deterministic addresses via the canonical CREATE2 deployer where useful.
Monitoring and alerting: reserve invariant watcher, feed staleness watcher, prize pool balance, indexer lag.
Public pages: proof-of-reserve, tokenomics explainer ("one sell button" story), risk disclosure.
Domains registered and pointed (pearlstreet.game, pearlstreet.gg, playpearlstreet.com).
Launch announcement assets for marketing: "first game on Robinhood Chain."

## Acceptance criteria

- [ ] All contracts deployed and verified on mainnet Blockscout
- [ ] Reserve invariant alert fires in a rehearsal (tested via testnet drill)
- [ ] Proof-of-reserve and tokenomics pages live
- [ ] Runbook for incident response (pause mint, feed outage, sequencer outage)
- [ ] Gen-0 mint opens from the project's own site
- [ ] Live-game window runs 3-4 days with the marketplace open and the leaderboard live
- [ ] PEARL pre-sale runs; the locked V3 position is created from 75% of proceeds and its timelock address is published; claim page opens (no airdrop)

## Decisions from the launch-readiness map (2026-08-16)

- Deploy with the operator Trezor (`forge script --trezor`); treasury/ops env parameters; mainnet deploy script must chain-guard against MockUSDG (`issues/03`, audit).
- Alerting runs in the same worker as the keeper (`issues/14`).
