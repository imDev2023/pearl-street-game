# Burn Cap and Retirement Loop - Design Notes

Status: proposed by the user 2026-08-15, brainstormed the same day; not yet decided, not yet in ECONOMY.md.
This is the design record for the "earn 4x, retire, re-buy" mechanic and everything hung off it.
Constants named here are placeholders to be simulated (`packages/sim`) and then decided by the user.

## The core idea (user, 2026-08-15)

Each creature has an earnings cap: once its lifetime pool hauls reach a multiple of its entry price (proposed 4x, so 400 CLAM on a 100 CLAM creature, 6,000 on a 1,500 team), it retires and the player must buy new creatures.

Why it is strong:

- It turns each creature into a depleting license, so winnings recycle into fresh demand instead of compounding forever.
- It caps the runaway whale compounding that made Crabada unstoppable for early bots.
- Every re-buy is new money: 30% to the pool, 70% to ops, plus marketplace rake if bought secondary.
- Bots become the best customers: the more efficiently a bot earns, the sooner it re-buys.

Two guardrails:

- Track cap progress per creature, on the token (lifetime hauls), never per wallet, or players dodge it by moving creatures between wallets.
- 4x is a ceiling, not a target: the pool still pays only what it holds, so most creatures never reach the cap; the pitch must say so.

## Making the burn attractive: the eleven ideas

Ranked by how essential they are to the loop.

### Must-have

1. **Retirement pays forward (relics).** A retiring creature leaves a soulbound relic on the wallet that boosts the next team: haul weight, affinity, leaderboard multiplier, or PEARL earning. Relics stack up to a cap, so veteran wallets are genuinely stronger. Team 2 beats Team 1; buying again is progression, not a tax.
2. **Re-mint discount.** A retirement grants a voucher (e.g. 20% off the next mint or priority in the next sale), so the burn is where new supply gets bought: protocol revenue, not just resale churn.
3. **Per-creature tracking on the token.** See guardrails.
4. **Uncapped layers stay uncapped.** Leaderboard pot and PEARL are never capped by the burn; the burn caps pool income per creature, a top player's total keeps growing. This is what keeps skilled humans past 4x.

### Strong additions

5. **Retired creatures become breeding stock.** Cap-out sends the creature to retirement rather than pure burn: no more voyages, but it can breed (Gen-1) or be lent through the tavern. Owners breed instead of dumping; Gen-1 supply enters through the 5,000/season gate.
6. **Visible, gamified cap progress.** "3.2x / 4x" on every creature; a final-voyage bonus near the cap; a public "most retirements this season" board.
7. **Cap extension by staking PEARL.** Sponsor a creature to 5x or 6x by staking PEARL against it: a hard PEARL utility that scales with how much a player earns, and a natural sink for whales who want to keep winning inside the rules.
8. **Insurance on the last stretch.** Above 3x the remaining runway is precious; sell insurance on it (premium into the pool). Nobody insures a fresh creature; everyone insures a nearly finished one.
9. **Team retirement bonus.** Retiring a full party of three at once earns a better relic than three solo retirements, keeping purchases in full parties.
10. **Public supply reduction.** Every retirement permanently reduces circulating Gen-0 (only 7,500 ever); show the live count. Rising scarcity makes unretired Gen-0 appreciate on the secondary market and makes early buying provably the best deal.
11. **Founder's Wake tie-in.** Retired Gen-0 relics carry the Founder's mark, grandfathering the +20% PEARL bonus onto every future team that wallet fields.
12. **Season-end amnesty.** Under-cap creatures roll over; the leaderboard scores progress this season, so retiring early is never punished.

### Steer away from

- **Rising re-buy prices.** Escalating cost per subsequent team is the Crabada breeding trap: it prices out the mid-tier and leaves only whales. Keep the price flat; let relics and vouchers be the progression.

## Bots and humans under this model

- Bots are welcome once rake exists: a bot is either a fish (loses at looting, buys creatures) or a pro (earns, but pays marketplace rake, gets looted by better bots, and re-buys at the cap). Both generate flow.
- Humans are the money-flow generators (marketplace, tavern, cosmetics, breeding); the design must keep them competitive, which relics (skill + tenure) and the leaderboard do.
- Honest framing: skilled players earn real income; casual players play a fair game for fun and prizes; nobody's income depends on new buyers arriving.

## PEARL's place

The un-cappable prestige layer. CLAM income per creature is capped by the burn; PEARL is what a player keeps building: earned by skilled play, boosted for Gen-0, throttled to 25% of trailing revenue, with a redemption floor from 30% of revenue. The more rake the game earns, the more PEARL is worth, aligning bots, humans, and the protocol on one number: revenue.

## Simulation results (2026-08-15, `packages/sim/scripts/income-report.mjs`)

Setup: sellout at launch (1,700 players, 7,500 creatures), zero growth, 365 days, calm market, features layered one at a time on the documented constants.
Proposed feature constants: looting contests 30% of daily hauls with 10% rake; marketplace 5% fee at the time of these runs (raised to 7% on 2026-08-15; rerun numbers below), trades at 90% of mint, daily trade chance casual 1% / skilled 4% / bot 6%; burn cap 4x with relics +5% each (max +30%), 20% re-mint voucher.

| Scenario | Pool day 365 (from 219,636) | Refill / release over the year | Loot moved | Market volume | Retirements | Re-buys | Ops treasury |
| --- | --- | --- | --- | --- | --- | --- | --- |
| launch scope (baseline) | 893 | 0.2% | 0 | 0 | 0 | 0 | 508,077 |
| + looting | 913 | 0.6% | 17,887 | 0 | 0 | 0 | 508,946 |
| + marketplace | 1,646 | 2.0% | 0 | 164,790 | 0 | 0 | 512,191 |
| + burn cap 4x | 893 | 0.2% | 0 | 0 | **0** | **0** | 508,061 |
| all three | 1,678 | 2.4% | 17,800 | 162,360 | 0 | 0 | 513,032 |
| all three, 50/50 hauls/leaderboard | 2,468 | 3.8% | 11,265 | 306,630 | 0 | 0 | 516,147 |

Per-archetype recovery of entry over the year (all three features, 80/20 split): casual 18.8%, skilled 39.6%, bot 50.7%; top 10% of players recovered 50.4%; 69 of 1,700 players fully paid back (skilled looters and lucky bots).
With the 50/50 leaderboard-heavy split: bots 62.1%, skilled 39.8%, casual 11.7%; the best single player earned 929 CLAM on 1,212 spent.

Rerun 2026-08-15 with the later-decided constants (vault 2% mint / 5% redeem, marketplace 7%): launch-scope refill 1.0% of release (was 0.2%), marketplace alone 3.5% (was 2.0%), all three 4.0% (was 2.4%), all three with the 50/50 split 5.5% (was 3.8%); ops treasury 513-524K CLAM. Same shape, better refill; the conclusions below stand.

### Finding 1: at 4x the burn cap never fires

The best bot creature earned 31.8 CLAM of pool hauls in a full year against a 400 CLAM cap.
The pool can only ever pay out ~30% of what was paid in (plus fees), so no creature can reach 4x from pool hauls under the documented constants; 4x is unreachable, not merely a ceiling.
The cap only starts to bite around 0.3x (30 CLAM per creature), which is where the loop actually turns over.

### Finding 2: the cap sweep shows what the loop really is

| Cap (x entry) | Retirements | Re-buys | Re-buy CLAM (new money) | Refill / release | Pool day 365 | Ops treasury | Bots recovered | Casual recovered |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.15x | 84,048 | 83,272 | 6,661,760 | 121.6% | 581,291 | 5,210,068 | 29.9% | 23.9% |
| 0.2x | 22,520 | 21,814 | 1,745,120 | 86.9% | 138,633 | 1,743,500 | 34.7% | 24.0% |
| 0.25x | 4,372 | 4,247 | 339,760 | 33.4% | 4,587 | 751,401 | 42.9% | 25.4% |
| 0.3x | 4,331 | 4,162 | 332,960 | 34.6% | 17,695 | 747,683 | 40.6% | 24.3% |
| 0.4x and above | 0 | 0 | 0 | 2.4% | 1,678 | 513,032 | 50.7% | 18.8% |

At low caps the pool grows and the treasury explodes (5.2M CLAM at 0.15x), but only because players re-buy at 80 CLAM after earning 15: it is a treadmill where every archetype's recovery FALLS (bots 51% to 30%).
That is the Crabada mining-expedition pattern in reverse: not a Ponzi (nothing printed), but a subscription disguised as a game.
The cap therefore trades player recovery for protocol revenue one-for-one; it cannot create income, only recycle it.

### Finding 3: looting and marketplace help the top, not the average

Looting is zero-sum plus rake: skilled players' recovery rose from 34.7% to 40.3% while casuals lost 10,957 CLAM to loot; the rake refilled the pool by only 0.6% of release.
The marketplace was the best refill lever (2.0%, 164K CLAM volume from 5% fee at modest churn) and gets much larger at higher churn; the 50/50 prize split doubled marketplace volume because skilled players and bots had more to trade for.
Combined, refill reached 3.8% of release; well short of the level (roughly 30%+) at which the pool stops decaying.

### What this means for the design

- Keep the burn cap as **retirement with relics and vouchers**, but size it as a small multiple of the pool-yield the design can actually pay, or define the cap in season-relative terms ("earned this season's median x N"), and never advertise "4x" as an earnings promise.
- The real refill needs churn: marketplace volume of the order of 30% of pool release per year, which means several trades per active player per month; that requires things worth trading (relics, cosmetics, Gen-1) rather than only creatures.
- Income for the top comes from redistribution (looting, leaderboard skew) far more than from the pool; the design that makes the game "income" for skilled players is prize-heavy plus PvP, and it must be sold as that.

## PEARL as income: simulation by market cap (2026-08-15, `packages/sim/scripts/pearl-report.mjs`)

Model: PEARL emission per day = min(schedule, 25% x trailing-7-day protocol revenue / PEARL price), per TOKENOMICS.md; the market cap sets the price of each token, never how many revenue can justify.
ASSUMED and flagged: 40% of the 1B cap is the play-rewards allocation over 4 years; Founder's Wake +20%; PEARL trading fees modeled as 2% of market cap in daily volume, 1% fee tier, protocol owns 60% of the pool.

### Game revenue only (no PEARL trading fees)

| Market cap | PEARL emitted (yr) | USD distributed | Median daily USD: casual / skilled / bot | PEARL share of earnings |
| --- | --- | --- | --- | --- |
| $1M | 4.33M | $4,329 | $0.16 / $0.75 / $2.10 | 2% |
| $10M | 2.17M | $21,652 | $0.17 / $0.82 / $2.27 | 10% |
| $50M | 1.97M | $98,295 | $0.24 / $1.05 / $2.94 | 33% |
| $100M | 1.30M | $130,320 | $0.27 / $1.14 / $3.21 | 40% |
| $200M | 0.65M | $130,335 | $0.27 / $1.17 / $3.26 | 40% |

Finding: with only game revenue, PEARL is a one-week event, not an income stream.
At the $50M cap, 1.92M of the year's 1.97M PEARL was emitted in week one, riding the $511K sale-day revenue through the 7-day window; afterwards daily revenue is $17-51, and emissions fall to ~100 PEARL/day.
$100M and $200M distribute identical dollars because the throttle caps value: price only changes the token count.
Casual recovery moves from 19% to 34%, bots from 53% to 82%; still nobody's income game.

### With protocol-owned LP trading fees (the user's recurring revenue source)

| Market cap | Trading fee revenue (yr) | PEARL emitted (yr) | USD distributed | Median daily USD: casual / skilled / bot | Casual / skilled / bot recovered | Players paid back |
| --- | --- | --- | --- | --- | --- | --- |
| $1M | $43,800 | 15.1M | $15,147 | $0.16 / $0.74 / $2.18 | 21% / 43% / 54% | 52 of 1,700 |
| $5M | $219,000 | 13.1M | $65,700 | $0.21 / $0.88 / $2.64 | 26% / 53% / 66% | 68 |
| $10M | $438,000 | 12.9M | $128,977 | $0.27 / $1.18 / $3.30 | 33% / 68% / 83% | 16 |
| $50M | $2,190,000 | 12.7M | $635,318 | $0.70 / $2.82 / $8.06 | 86% / 170% / 202% | 697 |
| $100M | $4,380,000 | 12.2M | $1,216,225 | $1.21 / $4.76 / $13.59 | 147% / 291% / 341% | 1,692 |
| $200M | $8,760,000 | 11.5M | $2,302,348 | $2.13 / $8.14 / $23.80 | 256% / 506% / 599% | 1,700 of 1,700 |

Findings:

- Trading fees are the only revenue source that scales with the market cap; at $10M they are already ~45% of protocol revenue, at $50M+ they are ~80-95%.
- The tipping point is between $10M and $50M: below it PEARL is a modest bonus (players still net-spend); at $50M the top half of players pay back within the year, and at $100M+ virtually every player, casual included, is net-positive - an income game for everyone.
- Sanity check on the $100M+ rows: "everyone profits" is funded by traders paying 1% per swap on ~$2M/day of volume; that volume assumption (2% of cap daily) is the whole result. If real volume is 0.2% of cap, divide the PEARL income by 10.
- Even at $200M, only 11.5% of the rewards schedule was emitted; the throttle, not the schedule, binds at every cap, and PEARL sold by players stays under ~7% of market cap per year in every scenario. Sell pressure is bounded by revenue exactly as designed.

### The counterfactual that shows why the throttle exists

Schedule-only emission (throttle removed) distributes 100M PEARL a year regardless of revenue: at $50M that is $5M to players against ~$0.5M of game revenue (bots recover 1,250%); at $200M, $20M against the same revenue (4,900%). That is TUS.
The throttle keeps the same emissions at $0.1-2.3M, all backed by revenue.

### What this means

- PEARL is the mechanism that can make Pearl Street an income game, and it does so honestly only when the game generates recurring revenue: trading fees on protocol-owned liquidity are the source that scales, and marketplace/looting rake are the game-side sources.
- Practical thresholds under the modeled assumptions: below ~$10M cap PEARL is a bonus; $50M is where skilled players earn real income; $100M+ is where casual play is net-positive.
- The 1% LP fee tier (Uniswap V3 style) is what makes the trading revenue meaningful; V2's fixed 0.3% would cut it by 70%. Trade-off: 1% taxes players' own exits.

## Constants to decide (after simulation)

- Cap multiple (proposed 4x).
- Relic boost per relic and the total relic cap.
- Re-mint voucher discount.
- Retirement vs pure burn as the end state.
- Whether cap progress counts leaderboard and loot winnings or only pool hauls (proposed: pool hauls only).

## Whitepaper phrasing

"Creatures earn, retire, and pass their legacy on. Every retirement funds the pool and unlocks a stronger team."
