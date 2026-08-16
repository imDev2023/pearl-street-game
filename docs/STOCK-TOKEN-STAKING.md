# Stock Token Staking: Design for T-017

Status: **custodial staking chosen by the user 2026-08-14**, overriding the earlier non-custodial recommendation.
The user directed the build to proceed without prior legal sign-off and accepts that risk; the agent flagged securities-offering exposure and the limits of a kill-switch.
Public whitepaper keeps the hedged "Stock Token horizon" language until the user decides to firm it up.

## Decision: the Berth Vault (custodial)

Players deposit eligible Stock Tokens into per-sector berths attached to their creatures.
Custody makes position measurement exact (deposit timestamps), so the observation machinery of the non-custodial variant is unnecessary.

### Hard guarantees (non-negotiable, mirror the CLAM vault)

- Withdrawals can never be paused; no function moves user tokens anywhere except back to the depositor.
- `retire()` kill-switch: one transaction permanently blocks new deposits and zeroes all boosts; withdrawals remain open until the last token leaves.
- Staking grants gameplay share only (of the capped daily pool release); it never mints emissions of any asset.
- Accounting in raw ERC-8056 units so total return (dividends, splits) accrues to the depositor automatically.

### Mechanics

- Eligible tokens: the 35 with live Chainlink feeds; per-token deposit caps (shared-beacon containment); beacon and multiplier event monitoring with alert-to-retire runbook.
- Power: affinity bonus +10% base to +25% cap, proportional to sqrt(staked USD), gated by creature level, ramped in over 5 days of sustained stake; unstake resets the ramp (anti-rental).
- PEARL exchange seats gate berth activation (primary PEARL sink); seat and rebalance fees in CLAM feed the standard revenue split.
- Houses: sector TVL sets seasonal standings; rewards remain cosmetic/event-level, never money.
- Geo-gate scaffold ships permissive: a deposit-time attestation hook that can be tightened by config, not migration.

## Fallback: Proof-of-Position (non-custodial), kept as the documented alternative

The game reads time-weighted wallet balances instead of taking deposits.
Retained in case the custodial path must be retired: same power curve, enforcement via mandatory checkpoints, keeper sampling, permissionless audits, and ramp vesting.

### Mechanism

- **TWAB measurement.** For each voyage epoch, compute the time-weighted average balance of eligible Stock Tokens (the 35 feed-covered tickers) in the player's wallet, read via Multicall3.
- **Valuation.** Raw balance x Chainlink feed price (already ERC-8056 multiplier-adjusted), so dividends and splits are handled automatically and no separate corporate-action logic is needed.
- **Power curve.** Sector affinity bonus scales from the base +10% up to a hard cap of +25%, proportional to sqrt(TWAB USD value), and gated by creature level.
  Capital deepens skilled play; it cannot substitute for it.
- **Zero-sum invariant.** The boost changes only the player's share of the capped daily pool release (1.5%/day).
  Proof-of-Position never mints anything and never touches emissions.
- **Anti-gaming.** Time-weighting dilutes mid-epoch wallet hops; one wallet's balance cannot back two accounts because power reads the wallet that owns the creatures.

### Enforcement: how a position is actually proven (decided 2026-08-14)

Power is rated at the **minimum balance observed during the epoch**, not a snapshot, observed through four layers:

1. **Mandatory checkpoints** at voyage start and settlement; both must show the position (buy-then-dump fails one end by construction).
2. **Keeper sampling** at unpredictable mid-epoch times via Multicall3 (verified: ~0.04 gwei gas, 960 reads in 4 calls, so fleet-wide audits cost cents).
3. **Permissionless position audits**: anyone can record an on-chain balance observation of any opted-in wallet at any time; rival houses are incentivized to audit each other, so the game polices itself.
4. **Ramp-up vesting**: the boost phases in over a multi-day sustained-minimum window (default 5 days, linear) and selling resets the ramp, which also breaks borrow-for-an-epoch rentals.

Formula:
`observed(epoch) = min(all observations)`;
`position = min sustained over trailing ramp window`;
`power = base + cap25(sqrt(position USD)) x ramp(days)`.

All observations are on-chain reads of public ERC-20 balances; anyone can re-derive every rating from transfer events plus audit records, so no trust in the project's indexer is required for outcomes.

### PEARL integration: the exchange seat

- Activating Proof-of-Position requires **locking PEARL** (a "seat on Pearl Street"), tiered by number of tracked berths.
- Seat activation/rebalance fees are paid in CLAM and flow into the standard revenue split.
- PEARL never earns more because the player holds securities; it only unlocks the feature.
  This is PEARL's primary endgame utility sink.

### The Houses (faction layer)

- Per-sector aggregate TWAB across all opted-in players sets seasonal house standings (Tech vs Energy vs Finance ...).
- House rewards are cosmetics, event modifiers, and leaderboard weight - never money - so the faction layer adds no pooled-custody or reward-for-holding surface.

## Options considered and rejected

| Option | Why rejected |
| --- | --- |
| Custodial sector berths | Custody of debt securities; inherits the shared-beacon upgrade risk for all 96 tokens |
| Pooled sector vaults | Same, plus pooled custody reads as a collective investment scheme |
| Stock Tokens as insurance-underwriting collateral | "Yield on securities collateral" is the heaviest regulatory framing; revisit only far post-launch with counsel |
| Stock holdings boost PEARL emissions | Never: "hold securities, earn our token faster" converts both assets into an investment product |

## Risk posture

- Nothing custodied, so nothing can be rugged, paused, or trapped; beacon upgrades cannot reach player funds through us.
- Stale or paused feeds freeze boost *updates* only; base gameplay and all exits continue.
- Geo-gating enforced at the contract/attestation layer, not UI; restricted jurisdictions (US and others per RHJ prospectus) excluded.
- Independent legal review is a hard gate before any code ships (T-017 acceptance criteria).
