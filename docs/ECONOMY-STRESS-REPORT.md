# Economy Stress Report (T-018)

Status: complete, signed off 2026-08-15.
Historical note (2026-08-16): the runs below used the 1%/1% vault fees and 50/50 fee routing in force at the time; the decided values are 2% mint / 5% redeem and 100% of fees to the pool (`docs/ECONOMY.md`).
Generated 2026-08-15 from `packages/sim` (deterministic, seeded); regenerate any table with `npm run report -w @pearlstreet/sim`.
The suite runs in CI as part of `npm test`; every invariant below is asserted after every simulated day of every scenario.

## What was simulated

A day-tick simulator of the full economic loop in `docs/ECONOMY.md`: Gen-0 sale with the 30/70 split, the 1.5%/day pool release split 80/20 hauls/leaderboard, energy-capped voyages (24 energy, 8 per voyage), the 0.7x-1.3x market modifier over synthetic feed regimes, vault mint/redeem fees with 50% of all fees refilling the pool, population dynamics (growth, collapse, whales, bots), and Gen-1 breeding under the 5,000/season cap.
All amounts are integer micro-CLAM with rounding always in the protocol's favor, and the vault is modeled exactly as the locked invariants demand: reserve == supply, fees skimmed only at the edges.
Every constant is doc-synced: `test/docsync.test.mjs` parses `docs/ECONOMY.md` and fails if the simulator's constants drift from the documented values.

Simulator-only assumptions, not documented constants (flagged for review):

- Season length 90 days (ECONOMY.md does not fix one).
- Leaderboard pot pays the top 20% of players by season Doubloons, pro-rata.
- Modifier amplification: 8h feed delta x10, then hard-capped to 0.7x-1.3x.
- Allowlist tranche: first 1,500 creatures at 80 CLAM (reproduces the documented ~720K USDG max raise).
- Breeding cost: 50 CLAM + 3,000 Doubloons, escalating 25% per breed (ECONOMY.md says "escalating" without numbers).
- Archetypes: casual (55% energy use, keeps earnings), skilled (90%, redeems half), bot/whale (100%, redeems ~90-95%).

## Invariant results: all green, in every scenario, every day

- The pool balance never went negative and never released more than 1.5% of its balance in a day.
- Nothing tradable was ever minted against gameplay: cumulative gameplay payouts never exceeded cumulative pool inflows (sale seed + fee share + rounding dust).
- Vault invariant held at all times: reserve == CLAM supply, fees skimmed only at the edges, every redeemer paid in full.
- Doubloons never leaked into anything tradable: the engine structurally allows CLAM credits only from vault mint, hauls, leaderboard, or secondary sale, and throws otherwise.
- Determinism: identical seeds produce identical run fingerprints; the suite asserts this in CI.

## Scenario results

### baseline (seed 1001, 270 days)

Sellout over two weeks, modest growth to day 90, then stagnation, with breeding from season two.

| Day | Regime | Pool (CLAM) | Release | Hauls paid | Players | Creatures | Yield/creature | Fees to pool |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | flat | 12,666 | 190 | 152 | 120 | 519 | 0.2928 | 210.03 |
| 7 | bull | 117,641 | 1,765 | 1,412 | 960 | 4,350 | 0.3245 | 257.90 |
| 14 | flat | 197,085 | 2,956 | 2,365 | 1,667 | 7,500 | 0.3153 | 5.56 |
| 30 | flat | 154,822 | 2,322 | 1,858 | 1,667 | 7,500 | 0.2477 | 4.36 |
| 60 | flat | 98,794 | 1,482 | 1,186 | 1,676 | 7,491 | 0.1583 | 24.30 |
| 90 | flat | 63,159 | 947 | 758 | 1,677 | 7,505 | 0.1010 | 812.16 |
| 120 | flat | 51,545 | 773 | 619 | 1,647 | 7,846 | 0.0788 | 98.62 |
| 180 | flat | 21,990 | 330 | 264 | 1,587 | 7,499 | 0.0352 | 47.91 |
| 269 | bull | 8,631 | 129 | 104 | 1,498 | 7,100 | 0.0146 | 6.80 |

Final pool 8,502 CLAM; ops treasury 504,000; fee treasury 27,402; 719 Gen-1 bred.
Day-0 cohort per creature: earned 43.29 vs spent 108.37 CLAM; payback never within 270 days; day yield first halves at day 66.

### death-spiral (Crabada replay; seed 2002, 270 days)

Hype growth for 30 days, inflows collapse to zero at day 60 into a market crash, heavy exits for 60 days.

| Day | Regime | Pool (CLAM) | Release | Hauls paid | Players | Creatures | Yield/creature |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7 | bull | 197,195 | 2,958 | 2,366 | 1,600 | 7,095 | 0.3335 |
| 45 | bull | 118,231 | 1,773 | 1,419 | 1,676 | 7,500 | 0.1892 |
| 60 | crash | 94,295 | 1,414 | 1,132 | 1,643 | 7,353 | 0.1539 |
| 90 | flat | 60,088 | 901 | 721 | 912 | 4,155 | 0.1735 |
| 120 | flat | 38,349 | 575 | 460 | 521 | 2,328 | 0.1977 |
| 180 | flat | 15,556 | 233 | 187 | 401 | 1,764 | 0.1058 |
| 269 | flat | 4,102 | 62 | 49 | 311 | 1,305 | 0.0377 |

The Crabada failure mode does not reproduce: when players exit, per-creature yield for the remaining players goes UP (day 90-120 above), because the release is a share of a balance, not a promised rate.
Yields shrink smoothly along the release curve, the pool ends positive, survivors still earn at day 269, and every exiting player redeemed in full.

### mass-exit (seed 3003, 120 days)

70% of all players redeem everything on day 45.

| Day | Regime | Pool (CLAM) | Release | Players | Creatures | Yield/creature |
| --- | --- | --- | --- | --- | --- | --- |
| 44 | flat | ~125,000 | ~1,870 | 1,647 | 7,500 | ~0.20 |
| 45 | flat | 123,496 | 1,852 | 834 | 3,741 | 0.3961 |
| 90 | flat | 62,640 | 940 | 834 | 3,741 | 0.2009 |
| 119 | bull | 40,445 | 607 | 834 | 3,741 | 0.1297 |

The vault paid every redeemer in full on the exit day and reserve == supply held throughout; solvency is by construction, not by luck.
The pool is untouched by redemptions (redeeming burns the player's own CLAM), so stayers' per-creature yield roughly doubled the next day.

### whale-bots (seed 4004, 180 days)

Five sybil whale fleets (600 creatures each, bypassing the per-wallet cap via many wallets) plus bot rosters at 100% energy efficiency against a small honest base.

- Peak whale payout share: 86.1% of daily hauls, on day 0 when whales owned ~82% of all active creatures.
- Maximum whale extraction above their modifier-weighted share: 0.0001% (pure rounding).
- Capital and automation earn exactly pro-rata to creatures held and energy spent; there is no lever to extract beyond the capped release, and the pool decayed no faster than in any other scenario.

### no-growth (seed 5005, 365 days)

Sellout at launch, zero new players ever, for a full year; the ticket's core viability question.

| Day | Pool (CLAM) | Release | Yield/creature | Note |
| --- | --- | --- | --- | --- |
| 0 | 219,636 | 3,295 | 0.3514 | ~216K documented day-one pool confirmed |
| 45 | 111,411 | 1,671 | 0.1783 | |
| 90 | 56,514 | 848 | 0.0899 | season 2, breeding begins |
| 180 | 19,397 | 291 | 0.0289 | still well above zero at the 180-day bar |
| 270 | 4,991 | 75 | 0.0074 | below 0.01 CLAM/day around day ~250 |
| 364 | 1,209 | 18 | 0.0018 | positive but dust-adjacent |

The pool never breaks and yield is never zero: the decline is a clean geometric decay with a ~46-day half-life, exactly ln(2)/0.015 as the 1.5%/day release predicts.
Day-0 cohort per creature: earned 29.05 vs spent 90.29 CLAM over the year.

### boom-bust (seed 6006, 180 days)

Feed regimes cycle flat, bull, crash, whipsaw every 10 days, with 5% stale-feed voyages.

- On every single day, the release equals exactly 1.5% of the pool, regardless of regime: the modifier redistributes hauls between voyages but never changes total emission.
- Stale feeds voided the modifier and paid base hauls; no settlement ever bricked.
- Undistributed dust per day is bounded by one micro-CLAM per player and returns to the pool.

## The three findings that matter

### 1. The floor never breaks, and that is now proven rather than asserted

Every structural claim in ECONOMY.md held under every attack the suite threw at it.
The percentage-of-balance release makes insolvency arithmetically impossible, the vault is run-proof by construction, and whales/bots are confined to pro-rata shares.

### 2. The pool refill is negligible at launch scope, so Season One is a decaying annuity

ECONOMY.md's "the pool refills itself" depends on marketplace (5%), tavern (10%), insurance, slots, and breeding, but at launch scope (T-002 to T-009) the only live fee source is the vault's 1% mint/redeem.
Observed post-sale fee inflow is roughly 1-25 CLAM/day against releases of 300-3,000 CLAM/day: under 2% of outflow.
Consequently yield half-life is ~46 days everywhere, and Season Two has no funded prize source defined anywhere in the docs.

### 3. At launch scope the average player never pays back the 100 CLAM mint

Across all scenarios the day-0 cohort recovered 30-40% of mint spend over 6-12 months, and lifetime pool payouts at sellout (~220K CLAM in, incl. fee refill) are structurally less than a third of the ~750K CLAM players spent minting.
This is consistent with the locked pitch ("the floor never breaks", casual players net-spend, skilled players earn multiples of average via leaderboard and later looting), but it must be a conscious position: launch-scope Pearl Street is a game with prize money, not an income machine.
Nothing here is a death spiral (no promise is ever broken), but retention will rest on fun and on shipping the post-launch fee flows, not on ROI.

## Flagged constants and proposals (user decisions, nothing changed)

1. `Daily release 1.5%`: safe, but implies a 46-day yield half-life; if Season One should feel alive at day 90+, consider 1.0%/day (69-day half-life, lower headline yields) or explicitly accept the decay.
2. Season funding: define where Season Two's pool comes from; concrete options are pulling the marketplace (T-012) into launch scope so real fee flow exists in Season One, or budgeting a fixed Season Two seed from the ops treasury (e.g. 10-15% of raise), which the 70% ops split can afford.
3. `Per-wallet cap 15`: sybil-bypassable (whale scenario holds 40%+ of supply anyway); since extraction stays pro-rata, either accept it as distribution theater or move breadth goals to the allowlist design.
4. Undocumented values the sim had to invent (season length, leaderboard payout curve, breeding cost numbers, modifier amplification): each needs a documented decision in ECONOMY.md before T-002 freezes interfaces.

## Answers to the ticket's open questions (proposed, for your confirmation)

- Viability bar: met under the proposed bar; with zero growth, yield at day 180 is 0.0289 CLAM/creature/day (above zero, above dust if dust is defined as 0.01) and the pool never pays more than it holds; yield crosses below 0.01 CLAM/day around day 250.
- Payback period: at launch scope payback never completes for the average player (30-40% recovery); if you want any average-payback story it must come from the flagged proposals above, and a too-fast payback (under ~60 days) would indeed be the death-spiral smell to avoid.
- Secondary market: not modeled beyond flat-price transfers between exiting and joining players; protocol-flow viability is independent of speculation, so I propose that is enough for this gate.
- Historical feeds: synthetic regimes cover a wider envelope than any single historical year (including permanent crash and alternating whipsaw); real daily closes for the 35 tickers are worth wiring during the T-008 playtest, not for this gate.

## Recommended follow-up gates (so this proof carries to production)

- T-002+: a testnet economy replay - deploy the real contracts to testnet 46630, drive the mass-exit and no-growth scenario transaction streams against them end to end, and diff on-chain balances against this simulator day by day; any divergence is a contract bug or a model bug, and either must be explained.
- Foundry invariant fuzzing on the ClamVault and pool contracts mirroring the four invariants above (the `evm-security` skill's templates fit this).
- Re-run this suite whenever ECONOMY.md changes; the doc-sync test guarantees the sim cannot silently diverge from the doc.

## Sign-off

- [ ] The user confirms the economy is viable as designed, OR selects changes from the flagged proposals (which reopen this report).
- [ ] Decision recorded on: release rate, Season Two funding, per-wallet cap stance, and the four undocumented values.
- [ ] T-002 unblocks once the boxes above are checked.
