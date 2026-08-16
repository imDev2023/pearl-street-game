# Pearl Street Tokenomics

The design goal: make the TUS death spiral arithmetically impossible.
Crabada had four tradable, inflating tokens (TUS, CRA, CRAM, GUS).
Pearl Street has exactly one asset with a price chart, and it launches only after the game is live and generating revenue (decided 2026-08-15: a short window after the Gen-0 sale, see the launch sequence below).

## The three currencies

| Currency | What it is | Can it dump? |
| --- | --- | --- |
| CLAM | USDG in a fully-reserved wrapper; the money of the game | No: only minted against deposits, always redeemable against reserve |
| Doubloons | Soulbound grind reward, earned by playing | No: non-transferable, no market can exist |
| PEARL | Capped protocol token, launched via pre-sale a few days after the game goes live | The only one, and its supply is throttled by revenue |

## CLAM mechanics

- Mint: deposit USDG, 2% fee (protocol revenue: 100% to the prize pool), receive the remainder in CLAM (6 decimals, matching USDG).
- Redeem: burn CLAM, 5% fee (protocol revenue: 100% to the prize pool), receive the remainder in USDG. Asymmetric on purpose (2026-08-15): cheap to enter, costly to leave, so every extraction refills the pool.
- Invariant: vault USDG balance == CLAM supply, always; verifiable by anyone with one RPC call.
- Redemption can never be paused; no function can withdraw reserve; the reserve is never deployed into yield.
- DEX price floats in the arbitrage band [0.95, ~1.0204]; this is expected and harmless for a game economy.
- Public framing: game currency / wrapped deposit, never "stablecoin".

## Why TUS died and how each failure is answered

| Crabada failure | Pearl Street answer |
| --- | --- |
| TUS minted without limit against playtime | Nothing tradable is ever minted against playtime; prize pools only pay what fees fund |
| Sinks (breeding) produced more emitters | Breeding capped per season; creatures earn soulbound Doubloons, not tradable mint |
| All sinks depended on new-player growth | Fees on money flow (wrap, redeem, marketplace, tavern, insurance) exist at any population size |
| Idle loop was bot food | Daily energy caps from day one; no sub-account scholarship system |
| Four tradable tokens, four sell buttons | One sell button (PEARL), launched after the game is live, capped, revenue-throttled |

## Revenue sources

CLAM mint and redeem fees (2% mint, 5% redeem), Gen-0 and breeding mints, marketplace fee, tavern rake, loot insurance premiums, team slot sales, season passes and cosmetics (later), tournament rake (later).

## Funding strategy (decided 2026-08-14, Option B)

The build is funded by the Gen-0 NFT pre-sale, not by a token sale.
Use of Gen-0 proceeds: at least 30% to the Season One prize pool; the remainder to development, marketing, and treasury reserve via the published operations wallet; exact split published before mint.
Gen-0 creatures carry the "Founder's Wake": a permanent founder bonus on PEARL rewards earned through play (never a purchase-based airdrop; mechanics subject to legal review).

**The PEARL launch pledge**, written into the public whitepaper: PEARL launches via a single public pre-sale a few days after the game is live, with
75% of proceeds locked into the PEARL/USDG liquidity pool (protocol-owned Uniswap V3 position, timelocked a minimum of 24 months, verifiable on-chain) and
25% to operations through the published operations wallet.
The 75% goes to the liquidity pool, never to the prize pool: the prize pool is funded only by the Gen-0 sale split and protocol fees.

## Launch sequence (decided 2026-08-15)

1. Gen-0 NFT sale: 7,500 creatures at 100 CLAM (80 allowlist), 30% prize pool / 70% operations. Priced in CLAM/USDG; other assets accepted only via swap at checkout.
2. Game live for a short window (three to four days): voyages, hauls, leaderboard on CLAM + Doubloons; real players and real revenue visible before any token exists.
3. PEARL pre-sale for a few days: public, listing price, per-wallet caps, vesting on large allocations.
4. Liquidity and trading: the protocol pairs 75% of pre-sale proceeds with PEARL into the locked PEARL/USDG Uniswap V3 pool (1% fee tier, full range); trading opens.
5. Claims open on the website: pre-sale buyers and Founder allocations claim through the same vesting contract (about 14 days; instant claims burn 50%). Nobody receives PEARL before the pre-sale; there is no airdrop.
6. Gen-0 Founder allocation is claimed, not airdropped, and vests through Season One play, tracked from game-live day one; a Founder who plays claims the full share, one who does not, does not.

The protocol-owned LP fee revenue counts as protocol revenue for the emission throttle and the floor reserve; it is the recurring revenue source that scales with the market cap.
No insider discount: event price equals listing price, per-wallet caps, vesting on large allocations, team vests longest.
The emission throttle and rising floor are unchanged by the launch event.

## PEARL (see T-016 and PEARL-TOKENOMICS.md)

- Hard cap; per-epoch emission = min(schedule, k x trailing-7-day revenue).
- Rising floor: a fixed revenue share fills a reserve; anyone can burn PEARL at floor = reserve / circulating.
- Buyback-and-make: a revenue share market-buys PEARL and pairs it as protocol-owned liquidity.
- Earned PEARL vests ~14 days; instant claims burn 50%.
- Staking PEARL yields fee share and Doubloons, never a new uncapped token.

## Honest limits

No tokenomics can make every player net-profitable; sustainable game economies need players who pay because playing is fun.
The design bounds sell pressure by real revenue; it does not repeal supply and demand.
Legal review is required for the CLAM wrapper, the raffle, and any Stock Token feature before mainnet.
