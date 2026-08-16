# Fee routing split
Type: grilling
Status: resolved
Blocked by: -

## Question
Operator (2026-08-16) changed the frozen 50% pool / 50% treasury routing: the vault's 2% mint fee and 5% redeem fee now go 100% to the prize pool.
Still open: does 100% pool apply to every fee that lands in the FeeRouter (marketplace 7% royalty, later looting rake), or only the vault fees; and is the treasury then funded solely by the 70% Gen-0 ops share and 25% of PEARL pre-sale proceeds.
Decided so far: vault fees 100% pool. FeeRouter constants and `docs/ECONOMY.md` change under T-002 (doc first, then GameConstants, then sim).

## Answer
Default taken 2026-08-16 (operator skipped the question after agreeing that skipped items take the recommendation; may be overridden any time before the relevant ticket ships).
Vault mint/redeem fees: 100% to the PrizePool (operator decision).
Marketplace 7% royalty and any later fee: 50% pool / 50% treasury, so ops keeps recurring income for gas sponsorship and keepers.
Treasury otherwise funded by the 70% Gen-0 ops share and 25% of PEARL pre-sale proceeds.
FeeRouter therefore needs per-source routing (vault vs marketplace) or two router instances; T-002 chooses the simpler shape.

Operator override (2026-08-16, later the same day): "All fees fund prize/player pool." Marketplace royalty and every later fee route 100% to the pool as well; the 50/50 default is void.
Applied: `docs/ECONOMY.md` routing sentence, `GameConstants.FEES_TO_POOL_BPS = 10_000`, sim constant, and both test suites (28/28 forge, 16/16 sim). Treasury is funded only by the 70% Gen-0 ops share and 25% of PEARL pre-sale proceeds.
Consequence surfaced: PEARL utilities that were sourced from fee revenue (staking fee share, floor reserve) now have no source; see ticket 22.
