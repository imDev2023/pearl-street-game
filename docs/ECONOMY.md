# Pearl Street Economy - Concrete Numbers

Single source of truth for economic constants.
Status: proposed defaults (2026-08-14), vault fees revised 2026-08-15, tuned during the T-008 playtest, final values published before mint.
Every constant here must exist in exactly one place in code with a test asserting its documented value.

## Gen-0 sale

| Constant | Value | Rationale |
| --- | --- | --- |
| Supply | **7,500 creatures** | 1,500 per species; 2,500 full parties; big enough for a real player base, small enough to stay scarce |
| Price | **100 CLAM** public; 80 CLAM allowlist | ~$100 entry per creature, ~$300 per playable party; Crabada-comparable entry without whale-only pricing |
| Per-wallet cap | 15 (5 parties) | Distribution breadth; resists day-one whale sweeps |
| Max raise | ~720,000 USDG at sellout | Assuming allowlist/public mix |
| Proceeds split | **30% Season One prize pool / 70% operations wallet** | ~216K CLAM day-one prize pool at sellout; ops covers dev, marketing, audit, treasury reserve |

Species are fixed at mint (1,500 each); stats and sector affinity roll at commit-reveal.

## The play loop

| Constant | Value | Notes |
| --- | --- | --- |
| Party size | 3 creatures | Crabada-proven |
| Starting team slots | 3 per account | Slot 4+ purchasable later (see sinks) |
| Energy | 24 per creature per day, refill 00:00 UTC | The anti-bot spine, day one |
| Voyage cost | 8 energy | Max 3 voyages per creature per day |
| Voyage duration | 8 hours | 3/day ceiling aligns with energy; overnight voyage spans the market open |
| Market modifier | 0.7x to 1.3x on base haul | Signed feed delta over the voyage, hard-capped both ways |
| Affinity bonus | +10% | Party sector matches the ticker |
| Stale/missing feed | Modifier voided, base haul paid | Never brick a settlement |
| Doubloons per voyage | 10 + performance bonus | Soulbound; scales with creature level later |

## The prize pool: structurally insolvency-proof

The pool releases at most **1.5% of its current balance per day**:

- 80% of the daily release funds voyage hauls, split across completed voyages by performance.
- 20% accrues to the season-end leaderboard pot.

Because the release is a percentage of the balance, the pool mathematically cannot run dry; more players means smaller individual hauls, never a broken promise.
Every reward on Pearl Street is a share of something real, never a printed number.

## Revenue routing: the pool refills itself

**100% of all protocol fee revenue flows into the active season prize pool** (revised 2026-08-16 from 50/50: every fee is a player pool refill; the treasury is funded only by the Gen-0 ops share and PEARL pre-sale ops share).

| Fee source | Rate |
| --- | --- |
| CLAM vault | 2% mint + 5% redeem (changed 2026-08-15 from 1%/1%: cheap to enter, costly to leave; every extraction refills the pool) |
| Marketplace / creature transfer royalty (T-012a) | 7% (changed 2026-08-15 from 5%; enforced in the creature token on every sale-shaped transfer, so it is captured on any venue) |
| Tavern rake (T-011) | 10% |
| Loot insurance (T-010) | Premium, priced per window |
| Team slots (T-014) | Slot 4: 500 CLAM + 5,000 Doubloons; escalating +50% per slot |
| Breeding (T-013) | CLAM + Doubloons, escalating per breed count |

This is the perpetual-motion piece Crabada never had: the pool is refilled by money *flow* (trading, hiring, insuring, breeding), which exists at any population size, instead of by new-player growth.

## Supply control

- Gen-0: 7,500, never re-issued.
- Breeding opens Season Two: Gen-1 capped at **5,000 per season**, escalating costs, 5-breed lifetime limit per creature, no parent-child or sibling pairing.
- Retirement: creatures can be burned into cosmetic relics, permanently reducing supply.

## Honest earning math (put a version of this in public docs)

At sellout, Season One's pool opens at ~216,000 CLAM.
Day-one daily release is ~3,240 CLAM; if 1,500 parties are active, the average party earns ~1.7 CLAM/day from the pool release, *plus* the fee inflow share, *plus* PvP redistribution once looting ships.
Skilled players (looting, affinity play, leaderboard) earn multiples of the average; casual players net-spend.
These are deliberately conservative, real numbers - the pitch is "the floor never breaks", not "1,000% APY".

## PEARL constants (Phase 4, see T-016 and TOKENOMICS.md)

- Hard cap: 1,000,000,000 PEARL.
- Rewards allocation emission: `min(schedule, 25% of trailing-7-day protocol revenue at TWAP)` per epoch.
- Post-launch, 30% of protocol revenue accrues to the redemption floor reserve.
- Launch event: 75% of proceeds to LP (24-month minimum timelock), 25% to operations.
- Founder's Wake: Gen-0 creatures earn a +20% bonus on play-earned PEARL.
