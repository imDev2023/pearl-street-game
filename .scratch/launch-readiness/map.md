# Map: Launch Readiness (wayfinder:map) - charted 2026-08-16

## Destination

Every decision and external dependency that could cause a contract failure or a broken gameplay experience at launch is closed and recorded, and the readiness gates before mainnet are agreed, so the build tickets in `docs/tickets/` (T-002..T-009, T-012a, T-016, plus whatever the launch-scope decision adds) can be executed straight through with no stops to ask the operator.
"Launched" means the full decided sequence: Gen-0 sale from our site, a live game window, PEARL pre-sale, locked PEARL/USDG V3 pool, claims.

## Notes

- Planning only: this map resolves decisions; execution stays in `docs/tickets/` (the build index) and each resolution updates the affected ticket file.
- Operator style: short questions, short answers; ship as soon as possible; no external dependency (audit, legal, funding) is allowed to gate launch.
- Consult: `CLAUDE.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/ECONOMY.md`, `docs/reference/ROBINHOOD-CHAIN.md`, `CONTEXT.md`; evm-security and solidity-security skills for contract questions.
- Tracker: local markdown (this directory); remote github.com/imDev2023/pearl-street-game.
- Readiness gates agreed 2026-08-16: all Foundry tests and the invariant campaign green in remote CI; Anvil replay matches the simulator; internal security review + bug bounty; testnet drills for reserve alert, feed outage, sequencer outage; contracts verified on Blockscout; risk disclosure live; incident runbook written; deploy key rehearsed. Testnet playtest and launch dry run are counted as done by the operator (ticket 07).

## Decisions so far

- [CLAM decimals](issues/01-clam-decimals.md) - 6, ADR-0001.
- [Guardian mint-pause](issues/02-vault-pause.md) - none; no owner, no admin surface, ADR-0002.
- [Treasury and ops address](issues/03-treasury-and-ops-address.md) - one hardware-wallet EOA (Trezor, `forge --trezor`), deploy-time env parameter, immutable after deploy.
- [Security review depth](issues/04-security-review-depth.md) - internal review + invariants + bug bounty are the gate; external audit only if funded, never a dependency.
- [Legal](issues/05-legal.md) - no legal gate anywhere; risk disclosure covers all; disclosure page mandatory before Gen-0 opens.
- [Tunable constants and PEARL price](issues/06-tunable-constants-and-pearl-price.md) - assumptions stand; PEARL price/size decided with the community after Gen-0.
- [Playtest and dry run](issues/07-playtest-and-dry-run.md) - counted as done (T-018 fleet run); production contracts still pass per-ticket testnet deploys and replay parity.
- [Repo visibility, domains, hosting](issues/08-repo-visibility-and-hosting.md) - public now, private at launch; domains/hosting deferred to near launch.
- [Launch-fitness audit](issues/12-launch-fitness-audit.md) - structure right, pre-commit; stack sufficient with keeper/revealer/indexer/monitoring/hardware-wallet/Slither additions; LeaderboardPot ops settlement is a rug surface; full report in `assets/launch-fitness-audit-2026-08-16.md`.
- [What is live at launch](issues/09-launch-scope.md) - unchanged: Chainlink feed voyages are the launch loop; "no equities" meant no Stock Tokens.
- [Land token](issues/10-land-token.md) - does not exist; CLAM, Doubloons, PEARL only.
- [Fee routing split](issues/21-fee-routing.md) - ALL protocol fees 100% to the prize pool (operator, twice confirmed); applied to ECONOMY.md, GameConstants, sim, tests.
- [ETH-to-CLAM swap](issues/16-eth-to-clam-swap.md) - Uniswap v3 live on 4663 with ~$9M WETH/USDG depth; keep ETH-via-swap plus direct USDG; addresses in the ticket.
- [Doc reconciliation](issues/20-doc-reconciliation.md) - PRD/TOKENOMICS/ECONOMY/CONTEXT/contract comments/reports/site copy brought to the decided values; whitepaper PEARL chapter left for T-016.
- [GitHub remote](issues/11-github-remote.md) - github.com/imDev2023/pearl-street-game, first commit pushed, CI green.
- [Equity feeds: weekends and tickers](issues/13-equity-feeds-at-launch.md) - voyages run 24/7, stale feed = base haul ("calm seas"); 35 tickers, timelocked changes (default).
- [Off-chain operations](issues/14-offchain-operations.md) - Cloudflare Worker cron keeper + revealer + alerts, anyone-can-poke fallback (default).
- [Leaderboard settlement](issues/15-leaderboard-settlement.md) - one capped merkle root per season, claim-based; ops-posted lists removed (default).
- [Royalty vs escrow](issues/17-marketplace-royalty-vs-escrow.md) - 7% on the buy leg only, escrow exempt (default).
- [Team slots](issues/18-team-slots-and-launch-caps.md) - enforce 3 per account at launch (default).
- [Gasless budget](issues/19-gasless-onboarding-budget.md) - first wrap + mint + 3 voyages per wallet, capped, funded from ops share (default).

## Not yet specified

- Domains (pearlstreet.game / .gg / playpearlstreet.com) and web hosting choice: near launch, operator's call.
- Indexer framework choice for the merkle builder and leaderboard API (T-006).
- PEARL fee-share and floor-reserve funding now that all fees go to the pool: ticket 22.
- Bug bounty programme shape (platform, scope, rewards) once the review depth decision is applied to T-008.
- Season Two content (Gen-1 via breeding, new mechanics, new NFTs): explicitly after launch, will be a fresh map.

## Out of scope

- Burn cap / retirement loop (`docs/BURN-CAP-DESIGN.md`): user decision 2026-08-15, not for launch.
- Stock Token holding, distribution, or staking (T-017): geo-gated, not for launch.
- Sub-account / scholarship systems: never.
- Season Two, Gen-1, breeding, tavern, looting, raffle, offers/auctions: post-launch tickets already exist in `docs/tickets/`, not this map.
