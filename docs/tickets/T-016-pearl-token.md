# T-016: PEARL token, pre-sale, liquidity, and claims

Status: launch scope (user decision 2026-08-15): pre-sale a few days after the game goes live; ships alongside T-009
Blocked by: T-002 (CLAM/USDG plumbing), T-004 (voyages, so play-earned PEARL and revenue exist); legal review before any public sale

## What this is

The single tradable asset of the protocol.
Allocation, launch sequence, mechanics, and the pre-sale sizing matrix: `docs/PEARL-TOKENOMICS.md` (split 40/15/10/15/12/5/3; matrix recommends ~$25M FDV, user has not chosen).
Emission and floor mechanics: `docs/TOKENOMICS.md`.
Economic model: `packages/sim` (`pearl-scenarios.ts`, `scripts/pearl-report.mjs`, `scripts/presale-matrix.mjs`); the throttle is asserted in CI.

## Contracts to build

- `PearlToken`: hard-capped ERC-20 (1,000,000,000), minted at genesis into the allocation buckets (vesting contracts and the emission controller), no further mint authority.
- `PearlPresale`: public sale at listing price, per-wallet caps, USDG in; on close, 75% of USDG + PEARL from the liquidity bucket create the PEARL/USDG Uniswap V3 position (1% fee tier, full range); the position NFT goes into a 24-month timelock whose address is published; 25% of USDG to the ops multisig. Nobody receives PEARL before this step.
- `PearlVesting` (the claim contract): one contract for pre-sale buyers, Founder allocations, and play rewards; ~14-day streaming, instant claim burns 50% (half of the burn to the floor reserve); claim page on the website.
- Founder allocation accrual: 5% bucket, tracked per Gen-0 creature from game-live day one, vests through Season One play (a Founder who voyages claims; one who does not, does not); claim, never airdrop.
- `PearlEmissionController`: per-epoch play emission = `min(schedule, 25% x trailing-7-day protocol revenue at TWAP)`; revenue is read from the FeeRouter/treasury flows plus the protocol-owned LP fees; distributed pro-rata to voyage weight; Founder's Wake +20% for Gen-0.
- `PearlFloor`: 30% of post-launch revenue accrues to a USDG reserve; anyone can burn PEARL for `reserve / circulating` (monotonic floor).
- Buyback-and-make: a revenue share market-buys PEARL and pairs it as additional protocol-owned liquidity (can ship post-launch; document the split).
- Team, treasury, and advisor vesting contracts per the split.

## Decisions to make before building (user)

- Pre-sale price and size (day-one FDV); recommendation ~$25M FDV / $3.75M raise in `PEARL-TOKENOMICS.md`.
- Trading-volume assumption for public messaging (do not quote income figures above the $1M/day column).
- Whether a secondary PEARL/WETH pool is seeded (unlocked, no protocol commitment).
- Verify Uniswap V3 factory/position-manager addresses on chain 4663 before writing the pairing code.

## Acceptance criteria

- [ ] Emission mathematically bounded by revenue in tests, including zero-revenue epochs (mirror the sim's throttle assertion on-chain)
- [ ] Floor redemption works and the floor is provably monotonic
- [ ] Vesting and early-claim burn paths exact; no PEARL claimable before pre-sale close
- [ ] Pre-sale: caps enforced, proceeds split 75/25 exactly, V3 position created and timelocked in the same flow, timelock address emitted
- [ ] Founder accrual matches play records from game-live day one; claim-only, no transfer to a wallet without a claim transaction
- [ ] Tokenomics paper (`PEARL-TOKENOMICS.md`) published before the pre-sale; whitepaper pledge language matches
- [ ] Legal review complete for the pre-sale and the Founder allocation
