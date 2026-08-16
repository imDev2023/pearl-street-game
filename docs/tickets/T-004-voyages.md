# T-004: Trading voyages

Status: ready
Blocked by: T-003

## Starting point

`contracts/src/VoyageGame.sol` + `PrizePool.sol` from the economy prototype: energy, day tranches, modifier 0.7x-1.3x with +10% affinity, stale-feed-pays-base, claims D+2..D+9, dust sweep; covered by `test/VoyageGame.t.sol`, `test/PrizePool.t.sol`, the invariant suite, the 120-day Anvil replay (matched the simulator within 0.03%), and the live testnet run.
Production work here is: real Chainlink proxy wiring (35 tickers, sector map in `packages/sdk`), fork tests against testnet feeds, event shape for the indexer, and the pending-transaction UX. Rewards are CLAM from the PrizePool release (already the prototype's model) plus Doubloons (already real in the prototype, not stubbed).

## What to build

The core game loop, demoable as: form a party of three, pick a ticker, send the voyage, come back later, claim the result.

A voyage locks three creatures for a fixed epoch and records the ticker's Chainlink feed price at start.
Settlement reads the feed again, staleness-checked, and applies a bounded reward multiplier from the signed price delta plus the party's stats and sector-affinity match.
Rewards pay CLAM from the season prize pool's daily release (never minted; the pool only pays what it holds; the prototype's tranche-and-claim model) and Doubloons (the prototype already credits them; T-005 adds sinks).
Feeds must be read through the proxy with `decimals()` respected; a stale or missing feed voids the market modifier and pays base rewards, never reverts a settlement permanently.
Voyage timing uses timestamps, never `block.number`.
UI: party builder, ticker picker showing live prices, active-voyage timers, claim flow, and pending-transaction handling that survives silently dropped transactions.

## Acceptance criteria

- [ ] Full loop works on testnet against real Robinhood feeds
- [ ] Reward multiplier is bounded (documented min/max) and exact in unit tests across up, down, flat, stale, and missing-feed scenarios
- [ ] Prize pool can never pay more than its balance; settlement cannot mint
- [ ] Creatures are locked during a voyage and unlock on settlement
- [ ] A voyage whose feed goes stale settles at base reward instead of bricking
- [ ] Mock-aggregator test suite plus a pinned fork test against testnet feeds

## Decisions from the launch-readiness map (2026-08-16)

- Weekends/off-hours: voyages run, stale feed pays base haul, shown as "calm seas" (`issues/13`).
- 35 tickers at launch; add/retire behind the 48h timelock, with a `live` setter (`issues/13`).
- Enforce 3 team slots per account at launch (`issues/18`).
- Keeper: Cloudflare Worker cron calls poke/release, settle, sweep; anyone can poke; a missed day retains its release in the pool (`issues/14`).
- Voyage lock on transfer must ship here (audit finding).
