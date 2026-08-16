# Map: Economy Prototype (wayfinder:map) - COMPLETE 2026-08-15, all five tickets resolved; build phase begins at T-002

## Destination

The basic launch economy (CLAM vault, Gen-0 mint, voyages, prize pool, Doubloons, leaderboard) proven working on-chain:
real contracts green under Foundry invariants, the full horizon replayed on Anvil and diffed against the T-018 simulator, a live multi-wallet run on testnet 46630, and a dashboard answering how players make money, how the protocol makes money, and the min/max a player can make.
Only then does anything else get built.

## Notes

- EXECUTION OVERRIDE (user, 2026-08-15): this effort carries execution, not just decisions, and the user authorized working multiple tickets per session ("go for it").
- Scope is the basic launch economy ONLY; breeding, marketplace, insurance, stock tokens, PEARL all come later, step by step.
- Consult: `docs/ECONOMY.md` (constants source of truth), `docs/ECONOMY-STRESS-REPORT.md` (T-018 findings), `packages/sim` (the model to diff against), `docs/reference/ROBINHOOD-CHAIN.md` (chain facts), evm-security skill for Solidity work.
- Wallets: `Crabada/.env` has MAIN_WALLET_PRIVATE_KEY (deployer/ops, 4.33 testnet ETH) + 6 test wallets, testnet 46630 only; never print keys.
- Testnet 46630 has NO USDG and NO Chainlink feeds; the prototype deploys MockUSDG and mock aggregators.

## Decisions so far

- [Destination and scope grilling](../../docs/tickets/T-018-economy-stress-test.md) - prototype-first: prove the basic economy profitable/workable before any other feature; T-018 flagged constants (1.5% release, Season Two funding, undocumented values) stay as documented for the prototype, parameterized, decided after the runs.
- Contract grade - first real cut of production economy contracts (real invariants, parameterized constants), not throwaway; they seed T-002.
- Clock strategy - option C: Anvil time-warp replay for full horizons AND live testnet at time-scaled game-days (1 day = 10 min).
- Feed strategy - option C: deterministic T-018 regime replay for stress runs, live mainnet price mirror for the demo session.
- Population - 6 env test wallets as named players plus ~24 generated bot wallets funded with dust gas from the main wallet (~30 players).
- Dashboard - local live page (viem, polls testnet RPC) + static artifact snapshot at the end; claude.ai artifact sandbox cannot call RPC.

- [economy-contracts](issues/01-economy-contracts.md) - ten first-cut contracts, 28/28 Foundry tests green incl. 4-invariant stateful fuzzing; vault has no pause/owner/withdraw by construction.
- [dashboard](issues/04-dashboard.md) - local live dashboard at 127.0.0.1:4173 (chain reads + fleet state, payback table, pool chart); verified headlessly, zero console errors.
- [anvil-replay](issues/02-anvil-replay.md) - 120 days on real contracts, all invariants held, pool matched the simulator within 0.03%; archetypes recovered 14-27% of entry.
- [testnet-run](issues/03-testnet-run.md) - live on 46630 with 30 wallets at 10-min days; healthy; contract correctly enforced claim windows against a lagging driver (driver fixed).
- Report: `docs/ECONOMY-PROTOTYPE-REPORT.md` holds the crux answers and the levers; only the [profitability verdict](issues/05-profitability-verdict.md) remains, and it is the user's.

## Not yet specified

- The profitability verdict itself: what earnings floor/ceiling and protocol revenue make the user call it "viable" (answered by the runs, decided by the user at the end).
- Whether the 1.5%/day release and the report's other flagged constants change after the prototype numbers are seen.
- How leaderboard season settlement gets trustless later (prototype uses ops-posted payouts; production wants indexer + merkle).
- Commit-reveal for creature stats at real mint (prototype derives stats deterministically; fine with no value at stake).

## Out of scope

- Breeding, marketplace, tavern, insurance, team slots, Stock Token staking (user, 2026-08-15: come later, step by step). PEARL moved INTO launch scope later the same day (see session decisions below); it stays outside this prototype's contracts but its economics are simulated.
- Mainnet anything; production hardening/audit (T-008 gate remains).

## Session decisions 2026-08-15 (later in the day)

- PEARL launches in launch scope: Gen-0 sale, 3-4 days of live game, then a PEARL pre-sale; 75% of pre-sale proceeds to the locked PEARL/USDG V3 liquidity pool (never the prize pool), 25% ops; claims via website with vesting, no airdrop; Founder allocation claimed through Season One play. Recorded in TOKENOMICS.md, PEARL-TOKENOMICS.md, PRD.md, T-016.
- Gen-0 stays at 7,500 (not 20,000). Sale stays CLAM/USDG-priced (ETH only via swap at checkout).
- PEARL split kept as proposed: 40/15/10/15/12/5/3 (rewards/pre-sale/POL/treasury/team/Founders/advisors).
- Simulator now covers looting, marketplace, burn cap, and PEARL by market cap (with and without LP trading fees); results in BURN-CAP-DESIGN.md.
- Still open: pre-sale price/size, volume assumption, burn cap multiple, the profitability verdict (ticket 05).
- CLAM vault fees changed 2026-08-15 from 1%/1% to 2% mint / 5% redeem (user; asymmetric so extraction refills the pool); fee routing stays 50% pool / 50% treasury. ECONOMY.md, contracts, sim, PRD, TOKENOMICS, T-002 updated; all suites green.
- Marketplace: minimum-viable list/buy/cancel with 5% fee (via FeeRouter) moved into launch scope as T-012a (user, 2026-08-15); offers/auctions/bundles/swap/tavern explicitly excluded until post-launch. Gen-0 sells from the project's own website via PearlCreatures.buyGen0 (no launchpad).
- Marketplace fee raised to 7% (user, 2026-08-15), enforced in the creature token as a royalty on any venue; dormant timelocked operator allowlist added to T-012a/T-003 (off at launch). ECONOMY.md, sim, tickets, PRD, CLAUDE.md updated.
