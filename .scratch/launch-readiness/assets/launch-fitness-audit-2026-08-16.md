# Launch-fitness audit (2026-08-16)

Produced by the AFK research ticket 12. File:line references are as of this date.

## Setup gaps

- No commits, no remote, CI has never run; every "green" claim is local only.
- CI is thin for a money repo: fmt/build/test only; no coverage, no Slither/solhint, no invariant run-count config, no Anvil replay job, no pinned forge version (`version: stable`); forge-std unpinned (`ci.yml:22`).
- Deploy scripts are prototype grade: `DeployPrototype.s.sol:33` deploys MockUSDG with no chainid guard and wires the vault to it; no mainnet deploy script; no hardware-wallet path (`DeployHarborBell.s.sol:23` requires PRIVATE_KEY).
- `apps/web` and `apps/indexer` test scripts are `echo`, so `npm test` is green with zero coverage.
- `MODIFIER_AMPLIFICATION` (`GameConstants.sol:30`) undocumented; `CLAIM_OPEN/CLOSE_AFTER_DAYS` live in `VoyageGame.sol:44-45`, outside GameConstants.
- Doc contradictions: PRD.md:76,79 and TOKENOMICS.md:17 say 18 decimals; PRD.md:54,84 and ECONOMY-PROTOTYPE-REPORT.md:11 and website/index.html:979,1072 say 1%/1% fees; PRD.md:83 says guardian mint pause; ClamVault.sol:35,46 comments say 1%; website/index.html:1153 says no PEARL sale; website sells Stock-Token "Berths" (1124,1128,1183) and trait odds (1166) nothing implements.
- Mocks live in `contracts/src/mocks/` and ship with production artifacts; HarborBell still in `src/`.
- No `.env.example`, no `.nvmrc`.

## Tech stack

In use: Foundry (solc 0.8.30, cancun, 10k runs), vendored forge-std, hand-rolled ERC20/ERC721 (no OpenZeppelin), Blockscout verify config, npm workspaces + TS 5.6, viem 2.21 (proto), node --test, GitHub Actions.
Planned but absent: Next.js + wagmi/viem, Alchemy AA v0.7, indexer framework.

Strictly necessary additions:
1. Keeper/cron for daily `release()` (via `VoyageGame.poke()`), per-day `sweep()` (nothing calls it; dust stranded), and `settle()` inside its one-day window.
2. Commit-reveal revealer service for the T-003 mint.
3. Indexer framework choice + merkle builder for LeaderboardPot.
4. Monitoring/alerting: reserve watcher, feed staleness, pool balance, indexer lag.
5. Hardware-wallet deploy support in forge scripts.
6. Testnet MockUSDG faucet surface.
7. Slither/solhint in CI (no external audit is a gate).

## Mechanics gaps

- Launch scope contradicted by operator statement (ticket 09); "land token" appears nowhere (ticket 10).
- Nobody owns release/sweep/reveal; a quiet day with no poke means no release for that day and no doc says so.
- ETH-to-CLAM swap at checkout assumes a DEX on 4663 that is unverified.
- Weekend/off-hours voyages silently pay base haul (2 of 7 days); no player-facing doc.
- `docs/ECONOMY.md:24` says 3 team slots per account; enforced nowhere; T-014 is post-launch, so unlimited concurrent parties at launch.
- Marketplace escrow (operator transfer, no sale price) vs in-token 7% royalty on operator transfers: unspecified interaction, including cancel and the dormant allowlist.
- LeaderboardPot settlement is ops-posted arbitrary lists; merkle only aspirational.
- Gasless onboarding (T-007) has no budget, rate limit, or paymaster funding source.
- Creature sold mid-voyage: no lock; buyer inherits spent energy, seller keeps payout (T-004:27 promises a lock).

## Contract smells

- `LeaderboardPot.sol:22-31`: ops can `settleSeason` any addresses, any amounts, unlimited times, no per-season dedupe or cap. Rug surface on a "cannot rug" project. Worst finding.
- `VoyageGame.sol:100-104`: `addTicker` ops-only, untimelocked, arbitrary feed address, and `Ticker.live` has no setter, so a dead feed can never be retired.
- `PearlCreatures.sol`: no supportsInterface/tokenURI/safeTransferFrom/ERC-165/ERC-2981; not wallet-displayable; `transferFrom:108-121` clears no game state, no voyage lock.
- No reentrancy guards where CLAM leaves (vault redeem, FeeRouter flush, claim, sweep, buyGen0); safe only while tokens are trusted; marketplace will need one.
- Bare `require(token.transfer(...))`, no SafeERC20, no balance-delta measurement.
- Fee rounding: vault ceils correctly; `PearlCreatures.sol:69` and `FeeRouter.sol:26-27` floor the pool share and give dust to ops/treasury.
- Clean: no block.number/prevrandao/blockhash; vault has no owner/pause/withdraw; decimals consistently 6.
