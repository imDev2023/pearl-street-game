# PEARL Tokenomics

Status: split and launch sequence decided by the user 2026-08-15; pre-sale price and size still open.
Mechanics (throttle, floor, buyback, vesting) are in `docs/TOKENOMICS.md`; this file holds the allocation, the launch sequence, and the open numbers.
Legal review is required before any public sale.

## Supply and allocation (decided 2026-08-15)

Hard cap: 1,000,000,000 PEARL.

| Bucket | Share | PEARL | Release |
| --- | --- | --- | --- |
| Play rewards | 40% | 400,000,000 | Emitted only through the revenue throttle, `min(schedule, 25% x trailing-7-day protocol revenue at TWAP)`; the schedule (linear over 4 years) is a ceiling, never a promise |
| Public pre-sale | 15% | 150,000,000 | Sold at listing price, per-wallet caps, vesting on large allocations; 75% of proceeds to locked liquidity, 25% to operations |
| Protocol-owned liquidity | 10% | 100,000,000 | Paired with pre-sale proceeds and buyback-and-make into the PEARL/USDG pool; position timelocked 24+ months |
| Treasury / ecosystem | 15% | 150,000,000 | 4-year linear; grants, partnerships, tournaments; published spend policy, no market sales |
| Team | 12% | 120,000,000 | 12-month cliff, then 36-month linear; the longest vest in the system |
| Gen-0 Founder allocation | 5% | 50,000,000 | Claimed, never airdropped; vests through Season One play, tracked from game-live day one (the Founder's Wake) |
| Advisors / partners | 3% | 30,000,000 | 6-month cliff, 24-month linear |

Insiders (team + advisors) hold 15%; players and public (rewards + pre-sale + Founders) hold 60%; the protocol (liquidity + treasury) holds 25%.

## Launch sequence (decided 2026-08-15)

1. Gen-0 NFT sale (7,500 at 100 CLAM; 30% prize pool / 70% ops).
2. Game live for three to four days on CLAM + Doubloons: players and revenue exist before the token does.
3. PEARL pre-sale for a few days.
4. The protocol creates the locked PEARL/USDG Uniswap V3 pool (1% fee tier, full range) from 75% of pre-sale proceeds plus PEARL from the liquidity bucket; trading opens.
5. Claims open on the website for pre-sale buyers and Founder allocations, all through one vesting contract (about 14 days; instant claim burns 50%). Nobody holds PEARL before this step; there is no airdrop.

## What PEARL does

- The un-cappable prestige layer: CLAM income per creature may be capped by retirement (see BURN-CAP-DESIGN.md); PEARL earnings are not.
- Founder's Wake: Gen-0 creatures earn +20% on play-earned PEARL, plus the dedicated 5% Founder allocation above.
- No fee share and no revenue-fed floor (dropped 2026-08-16: all protocol fees go to the prize pool); PEARL utility is throttled play rewards, protocol-owned locked liquidity, and Founder claim-through-play. Later, PEARL seats may gate Berths (T-017).
- Floor: 30% of post-launch revenue accrues to a reserve; anyone can burn PEARL for `reserve / circulating` USDG.

## Revenue that drives emission

All protocol revenue counts toward the throttle: Gen-0 and later sales (ops share), CLAM vault fees, marketplace fee, looting rake, tavern rake, insurance premiums, and the protocol-owned LP's swap fees.
The LP fee revenue is the source that scales with the market cap; the simulation (`packages/sim/scripts/pearl-report.mjs`, results in BURN-CAP-DESIGN.md) shows PEARL becomes real player income between a $10M and $50M market cap under a 2%-of-cap daily volume assumption, and that the throttle keeps player sell pressure under ~7% of cap per year at every cap tested.

## Pre-sale matrix: FDV x daily trading volume (simulated 2026-08-15, `packages/sim/scripts/presale-matrix.mjs`)

Setup: sellout, zero growth, 365 days, all launch features on (vault 2%/5%, marketplace 7%, looting), 1% LP fee tier, protocol owns 60% of the pool, 40% rewards allocation over 4 years.

Pre-sale sizing (15% bucket at listing price; 75% of the raise seeds locked liquidity):

| FDV | PEARL price | Pre-sale raise | To locked liquidity | To ops |
| --- | --- | --- | --- | --- |
| $10M | $0.010 | $1.5M | $1.125M | $375K |
| $25M | $0.025 | $3.75M | $2.81M | $938K |
| $50M | $0.050 | $7.5M | $5.63M | $1.88M |

Median daily USD income per player, casual (3 creatures) / skilled (6) / bot (15):

| FDV \ Volume/day | $200K | $1M | $2M | $5M |
| --- | --- | --- | --- | --- |
| $10M | 0.27 / 1.19 / 3.37 | 0.64 / 2.58 / 7.48 | 1.00 / 3.96 / 11.58 | 1.03 / 4.15 / 11.79 (schedule-capped) |
| $25M | 0.29 / 1.22 / 3.56 | 0.67 / 2.68 / 7.73 | 1.12 / 4.41 / 12.77 | 2.20 / 8.10 / 25.02 |
| $50M | 0.34 / 1.38 / 4.01 | 0.70 / 2.75 / 8.09 | 1.18 / 4.66 / 13.40 | 2.55 / 9.93 / 28.49 |

Entry recovered in year one, casual / skilled / bot:

| FDV \ Volume/day | $200K | $1M | $2M | $5M |
| --- | --- | --- | --- | --- |
| $10M | 33% / 69% / 84% | 77% / 155% / 186% | 121% / 240% / 287% | 123% / 251% / 290% |
| $25M | 36% / 72% / 89% | 80% / 160% / 192% | 134% / 267% / 318% | 267% / 525% / 618% |
| $50M | 41% / 82% / 100% | 85% / 168% / 200% | 142% / 282% / 334% | 306% / 603% / 703% |

Players fully paid back within the year (of 1,700): $200K/day 37-126; $1M/day 518-716; $2M/day 1,612-1,679; $5M/day 1,613-1,700.

Readings:

- Volume matters far more than FDV. Across a 5x range of FDV, incomes move ~20%; across the volume range they move 10x. The pre-sale price sets the raise; the trading volume sets whether it is an income game.
- The tipping point is about $1M/day: skilled players and bots pay back within the year at every FDV; casuals need ~$2M/day.
- The plausibility check is the turnover row: $1M/day is 10% of a $10M FDV turning over daily (very high, meme-tier), 4% of $25M (high but seen in active gaming tokens), 2% of $50M (plausible for a healthy mid-cap). The same absolute volume is far more believable at the larger FDV.
- At $10M FDV the rewards schedule, not revenue, becomes the cap above ~$2M/day (100M PEARL/yr = $1M at $0.01): PEARL income stops rising with volume. A low FDV therefore caps the upside of the reward pool in dollar terms.
- Sell pressure stays bounded: PEARL sold by players is under ~7% of FDV per year in every cell.

## Open decisions

- Pre-sale price and size (sets the day-one market cap; anchor toward $10-25M FDV, the low end of the tipping band, so revenue can grow into it).
- Realistic trading volume assumption for Robinhood Chain (the load-bearing number for every PEARL income figure).
- Exact revenue-share splits between the floor reserve and buyback-and-make.
- Whether a secondary PEARL/WETH pool is seeded (unlocked, no protocol commitment) for ETH-holder access.
- Sale-day mechanics for accepting ETH at checkout via swap while pricing in CLAM/USDG.
