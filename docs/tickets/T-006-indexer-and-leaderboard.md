# T-006: Indexer and season leaderboard

Status: ready
Blocked by: T-004

## Starting point

`contracts/src/LeaderboardPot.sol` (prototype: ops-posted season payout, flagged trust point) and the events in `VoyageGame`, `PearlCreatures`, `ClamVault`.
Production replaces ops-posting with an indexer-computed merkle distribution: the pot contract verifies a root, players claim. `packages/proto/scripts/testnet-bots.mjs` shows the season-settlement math the indexer must reproduce (top 20% by season Doubloons, pro-rata; season length 90 days assumed, user to confirm).
Also serves marketplace listings/floor (T-012a) and PEARL claim balances (T-016).

## What to build

Fast game data without hammering the RPC, demoable as: a public leaderboard page that updates within seconds of a settlement.

An event indexer over all game contracts feeding a queryable API: player stats, voyage history, creature ownership, season standings.
Season leaderboard ranks players by voyage performance; the season prize pool contract pays the top ranks in CLAM at season end (funded by fees and mint revenue, never minted).
NFT metadata serving if T-003 chose indexer-hosted metadata.

## Acceptance criteria

- [ ] Leaderboard reflects a new settlement within one indexer poll interval
- [ ] Voyage history and P&L per player queryable via public API
- [ ] Season-end payout is exact, capped by pool balance, and tested
- [ ] Indexer survives RPC hiccups and resumes from its checkpoint

## Decisions from the launch-readiness map (2026-08-16)

- Season settlement is one indexer-computed merkle root per season, posted once, capped at the accrued pot, claim-based; ops-posted payee lists are removed from LeaderboardPot (`issues/15`).
