# Economy Prototype Report

Status: complete; the user's verdict (2026-08-15) was to launch Gen-0 and iterate on real numbers.
Historical note (2026-08-16): the prototype ran with 1%/1% vault fees and 50/50 fee routing; the decided values are 2% mint / 5% redeem and 100% of fees to the pool (`docs/ECONOMY.md`).
Date: 2026-08-15.
Companion to `docs/ECONOMY-STRESS-REPORT.md` (the off-chain model, T-018); this report is the on-chain proof of that model.

## What was built

Ten first-cut production contracts in `contracts/src/` implementing the basic launch economy exactly as `docs/ECONOMY.md` documents it:

- `ClamToken` + `ClamVault`: USDG-backed CLAM, 1% mint / 1% redeem fees skimmed at the edges, no owner, no pause, no withdraw path; `reserveSurplus()` exposes the reserve == supply invariant on-chain.
- `FeeRouter`: every fee lands here and splits 50% prize pool / 50% treasury, addresses immutable.
- `PrizePool`: releases at most 1.5% of its current balance per game day, game-only, once per day, 80% hauls / 20% leaderboard pot; there is no other outflow.
- `PearlCreatures`: Gen-0 sale, 30/70 pool/ops split, 15 per wallet, allowlist pricing.
- `VoyageGame`: energy (24/day, 8 per voyage), day tranches, market modifier 0.7x-1.3x with affinity +10%, stale feed voids the modifier and pays base (never bricks), claims at D+2..D+9, dust sweeps back to the pool.
- `Doubloons`: soulbound by construction (no transfer function exists).
- `LeaderboardPot`: ops-posted season payout (flagged prototype trust point).
- `MockUSDG` + `MockAggregator`: testnet 46630 has neither USDG nor Chainlink feeds.

Every economic constant lives in `GameConstants.sol` with a test asserting its documented value; the TypeScript simulator doc-syncs against `docs/ECONOMY.md`, so the doc, the sim, and the contracts cannot drift apart silently.

## Test evidence

- Foundry: 28/28 tests green, including a stateful invariant suite (`test/Invariants.t.sol`) driving deposits, redeems, purchases, voyages, settlements, claims, sweeps, price moves, and time warps across ~12,800 randomized calls per action with zero reverts.
  Invariants: vault reserve == CLAM supply; daily release never exceeds the 1.5% cap; the game holds exactly the unclaimed, unswept tranches; total CLAM supply equals the sum of all holdings.
- Anvil full-horizon replay: 120 game days against the real contracts (30 players, 135 creatures, three archetypes, feed regimes flat/bull/crash/whipsaw), invariants asserted after every day.
- Testnet 46630 live run: 30 wallets (6 named test wallets + 24 generated bots) at 10-minute game days, real sequencer, prices mirrored from the mainnet Chainlink feeds; day 5+ at time of writing, 382 voyages, vault surplus 0.

## Anvil replay: real contracts vs the simulator

The on-chain pool trajectory matched the T-018 simulator to within 0.03% on every one of 120 days.
The model the stress report was built on is therefore validated against the actual Solidity.

| Day | Regime | Pool on-chain (CLAM) | Pool simulator | Drift | Released | Voyages |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | flat | 3,246 | 3,245 | 0.0% | 48.60 | 105 |
| 7 | bull | 2,921 | 2,920 | 0.0% | 44.47 | 105 |
| 14 | flat | 2,628 | 2,627 | 0.0% | 40.02 | 106 |
| 30 | flat | 2,064 | 2,064 | 0.0% | 31.44 | 100 |
| 45 | flat | 1,646 | 1,646 | 0.0% | 25.07 | 104 |
| 60 | crash | 1,313 | 1,313 | 0.0% | 19.99 | 100 |
| 75 | whipsaw | 1,047 | 1,047 | 0.0% | 15.95 | 104 |
| 90 | flat | 835 | 835 | 0.0% | 12.72 | 100 |
| 105 | flat | 666 | 666 | 0.0% | 10.14 | 98 |
| 119 | bull | 539 | 539 | 0.0% | 8.21 | 108 |

The crash and whipsaw regimes (days 60-90) changed which voyages earned but never the total released: emission is a function of balance only, exactly as designed.

### Player economics by archetype (120 days, on-chain)

| Archetype | Players | Creatures | Hauls claimed (CLAM) | Per creature | Entry cost (USDG) | Recovered |
| --- | --- | --- | --- | --- | --- | --- |
| casual (55% energy, random tickers) | 21 | 63 | 716.82 | 11.38 | 5,091 | 14.1% |
| skilled (90% energy, affinity play, redeems half) | 7 | 42 | 820.56 | 19.54 | 3,394 | 24.2% |
| bot (100% energy, affinity, redeems 95%) | 2 | 30 | 657.78 | 21.93 | 2,424 | 27.1% |

Per-creature lifetime haul ranged from 10.45 (worst casual) to 21.93 CLAM (bot); play quality doubles earnings, but nobody approaches payback in 120 days.

### Protocol economics (120 days)

- Ops treasury: 7,620 CLAM (70% of the 10,800 CLAM sale, plus 50% of fees).
- Prize pool remaining: 539 CLAM of the 3,240 seed; leaderboard pot accrued: 552 CLAM.
- Fee refill to the pool over 120 days: under 30 CLAM (vault fees only), against ~2,700 CLAM released.
- Doubloons earned: 378,435, all soulbound.

## Testnet run (live)

Deployment record: `.scratch/economy-prototype/assets/testnet-deployment.json`; dashboard: `npm run dashboard -w @pearlstreet/proto` then `http://127.0.0.1:4173`.
At day 5: pool 4,499 CLAM (from a 5,040 seed at the public price), 382 voyages, per-player claimed min 1.02 / avg 5.66 / max 21.24 CLAM, vault surplus 0 on every day boundary.

One real-network finding: a slow leg (30 wallets on the public sequencer) can straddle a day boundary, and the contract correctly refused two claims the driver had mis-attributed to the earlier day ("weights not final").
The contract enforced its rule against a lagging client; the driver was fixed to trust the chain's day (from the `VoyageStarted` event) and to claim across the whole D+2..D+9 window.
The transactions-can-be-dropped guidance held too: every send times out and retries, and none were lost.

## The three crux answers

**How people make money.** Only from the prize pool's daily release, split by modifier-weighted voyages, plus the season leaderboard pot.
Both are shares of money previously paid in (30% of mint proceeds + 50% of fees); no CLAM is ever created by play.
At the documented sellout scale (216K CLAM pool, 7,500 creatures) that is ~0.35 CLAM per creature per day on day one, decaying with a ~46-day half-life while fee refill is negligible.

**How the protocol makes money.** 70% of Gen-0 proceeds to ops (proven: 7,620 of 10,800 CLAM in the replay), plus 50% of all fee revenue.
At launch scope the fee side is tiny (vault mint/redeem 1% only); the marketplace, tavern, insurance, breeding, and slot fees that ECONOMY.md counts on are all post-launch tickets.

**Min and max a player can make.** In one day at sellout scale: minimum ~$0.08 (one creature, one voyage, bad market), typical casual party ~$0.55, maximum honest wallet (15 creatures, perfect play) ~$7.50, sybil whale with 600 creatures ~$300.
Losses from play: zero; the only exposure is the entry price (100 CLAM per creature) and the 1% redeem fee.
Fewer active creatures multiplies every figure (1,000 active instead of 7,500 means 7.5x), and the pool never pays more in total.

## Verdict material

Proven, structurally and now on-chain:

- The pool cannot go insolvent; the release is a percentage of a real balance.
- The vault is run-proof and unpausable by construction; every redeemer is paid in full.
- Whales and bots earn pro-rata and cannot extract beyond the capped release.
- Doubloons cannot leak into anything tradable.

Not viable as an income game at launch scope, by arithmetic rather than by bug:

- A closed pot pays out at most 30% of what players paid in plus fees; the average player must lose money.
- Fee refill at launch is under 2% of outflow, so Season One is a decaying annuity and Season Two has no funded source.
- Bots are pure extractors at launch scope (their only fee is the 1% on redeem) and out-compete the human players who would generate the fee flow.

Levers (user decisions, nothing changed):

1. Bring the marketplace (5% fee) into launch scope so real money flow refills the pool from day one.
2. Skew toward the leaderboard pot (e.g. 40/60 instead of 20/80) to make top-player earnings genuinely attractive and to make the product a prize game rather than "everyone earns a little".
3. Add opt-in sinks (team slots, cosmetics, breeding) that bring new money in from wants, not from ROI expectations.
4. Consider a smaller Gen-0 supply or larger pool seed for early per-creature numbers (does not change the closed-pot math).
5. Decide the undocumented values the prototype had to assume: season length 90 days, leaderboard pays top 20% pro-rata, modifier amplification x10, breeding costs.

## Prototype trust points to resolve before production

- Leaderboard settlement is ops-posted; production wants an indexer-computed merkle distribution.
- Creature stats derive deterministically from token id; the real mint needs commit-reveal (no VRF on this chain).
- Mock feeds and mock USDG exist only because testnet has neither; mainnet uses the real 35 Chainlink proxies and real USDG.

## Reproduce

- Contracts: `cd contracts && forge test`.
- Anvil replay: `npm run replay -w @pearlstreet/proto -- --days 120` (starts its own Anvil on port 9556), then `node scripts/analyze-replay.mjs`.
- Testnet: `npm run testnet:deploy -w @pearlstreet/proto` (needs the funded main wallet in `../.env`), then `npm run testnet:bots` and `npm run dashboard`.
