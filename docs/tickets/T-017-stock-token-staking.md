# T-017: Stock Token staking (Berth Vault)

Status: backlog (user directed build to proceed without prior legal sign-off, 2026-08-14; legal review remains recommended and the geo-gate scaffold ships permissive)
Blocked by: T-009

## What to build

Endgame feature: Stock Token holdings grant in-game power aligned with the creature's sector.
Full design in `docs/STOCK-TOKEN-STAKING.md` - decided direction is **non-custodial Proof-of-Position** (time-weighted wallet balances read on-chain, sqrt power curve capped at +25%, PEARL seat to activate, sector Houses faction layer); custodial staking variants were considered and rejected there.

Strictly geo-gated (Stock Tokens are debt securities: no US persons; restrictions in UK, Canada, Switzerland).
The design must survive the shared-beacon upgrade risk (all 96 tokens share one upgrade beacon) and multiplier changes (ERC-8056 corporate actions).
Do not build any part of this before written legal guidance.

## Acceptance criteria

- [ ] Written legal guidance on offering this feature, per jurisdiction
- [ ] Geo-gating enforced at contract or signature layer, not UI only
- [ ] Multiplier-change and paused-oracle scenarios handled
