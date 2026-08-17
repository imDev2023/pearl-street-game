# Pearl Street

An idle creature game on Robinhood Chain where real stock prices (via Chainlink feeds) drive voyage outcomes.
Successor in spirit to Crabada, with an economy designed so the TUS-style death spiral cannot happen.

## Current status (2026-08-16, launch-readiness map open)

- **Decision layer:** `.scratch/launch-readiness/map.md` (wayfinder map) holds every open launch decision and the audit findings; work its frontier before or alongside T-002. Resolved decisions are mirrored into ADRs (`docs/adr/`) and the build tickets.
- Whitepaper + site are a first-class launch asset (user, 2026-08-16): dedicated pass planned near T-016; PEARL has no fee share/floor (all fees to the pool).
- **Next unit: T-003 Gen-0 creature mint** (`docs/tickets/T-003-creature-mint.md`); T-002 done 2026-08-16 (testnet vault `0xAF8e9A558C70b6F66724F4fCEaef34310798B759`, addresses in `packages/sdk/src/addresses.ts`). The ticket index (`docs/tickets/README.md`) is the frontier.
  User decision 2026-08-15: economy modeling is closed; launch Gen-0, read real volume, iterate. Do not reopen it unless asked.
- `docs/ARCHITECTURE.md` is the system map: which prototype contract each ticket starts from (they are the starting point, not throwaway), money flows, the launch sequence, frozen decisions, and the user's open decisions. Read it before code.
- Economy phase outputs: `docs/ECONOMY-STRESS-REPORT.md`, `docs/ECONOMY-PROTOTYPE-REPORT.md`, `docs/PEARL-TOKENOMICS.md` (incl. the pre-sale matrix), `docs/BURN-CAP-DESIGN.md` (ideas + sim results; not decided, not in scope).
- Prototype processes (testnet bot fleet, dashboard) are stopped; not needed for the build. Bot keys in gitignored `packages/proto/.env.bots`; testnet deployment record in `.scratch/economy-prototype/assets/`.
- User externalities still open: pearlstreet domains and hosting near launch. Legal review is NOT a gate (risk disclosure covers everything, decision 2026-08-16); external audit is optional, not a gate.
- Art is CLOSED until a final pass at project end (`docs/ART-DIRECTION.md`). Published artifacts (republish the same file path with the `url` param): site https://claude.ai/code/artifact/17686ae1-2f0d-4c80-87c2-8d9133d8bcb4 · art sheet https://claude.ai/code/artifact/448c773a-6985-4b8c-b879-4e3786ab8638. The whitepaper's PEARL pledge chapter must be rewritten to the decided sequence before the site goes public (T-016 criterion).
- Remote: github.com/imDev2023/pearl-street-game (public now, private at launch); first commit 2026-08-16, CI green; no agent attribution trailers.
- Deploy key: operator's Trezor via `forge script --trezor`; treasury/ops addresses are deploy-time env parameters.

## Traps found the hard way (keep)

- Foundry: `vm.prank(x)` is consumed by the NEXT external call, including a view read used as an argument (`game.claim(read())` runs as the test contract). Resolve arguments first, then prank. This silently made the invariant handler revert 94% of `sail` calls until fixed.
- Local nodes: never bind Anvil to 8545 - other projects on this machine run their own nodes there (a run once deployed onto a stranger's chain-97 node). `packages/proto` uses port 9556 and refuses to start if it is taken.
- viem on Anvil: default receipt polling (4s) makes multi-thousand-tx replays crawl and time out; set `pollingInterval` low and put a timeout + retry on every send.
- Public testnet: a slow leg of 30 wallets can straddle a game-day boundary; the contract correctly enforced the claim window against a driver that mis-attributed the day. Trust the chain's day (from events), never the driver's clock.
- Testnet 46630 has NO USDG and NO Chainlink feeds; anything realistic needs the mocks in `contracts/src/mocks/`. `DeployClam.s.sol` refuses mocks on 4663.
- The proto drivers compute gross deposits from the sim's `VAULT_MINT_FEE_BPS`; they silently under-funded players for a day when the fee changed and the constant was hard-coded. Never hard-code an economic constant in a driver.
- Foundry `forge fmt --check` is a CI gate; run `forge fmt` before committing Solidity. Fuzz tests must handle the all-fee dust case (a 1-unit deposit mints 0 CLAM to the player); a `% balance` on a zero balance was the first remote CI failure.
- The 4x burn cap can never fire under the documented pool math (pool pays ~30% of entry, max); do not build a retirement mechanic on a promised multiple.

## Start here, every session

1. Read `docs/PRD.md` for what we are building and every locked decision, then `docs/ARCHITECTURE.md` for the system map and the prototype code each ticket builds on.
2. Read `docs/tickets/README.md` and pick the lowest unblocked ticket that is not done.
3. Read the ticket file itself; update its Status line as you work.
4. `docs/reference/ROBINHOOD-CHAIN.md` is the verified chain reference; trust it over memory and re-verify moving values (prices, supplies) on-chain before production decisions.

## Locked decisions (do not relitigate without the user)

- Name: Pearl Street (handle pearlstreet). Currencies: CLAM (USDG wrapper, 2% mint + 5% redeem fee, revised 2026-08-15), Doubloons (soulbound), PEARL (capped, revenue-throttled; launches via pre-sale a few days after the game is live, 75% of pre-sale to locked PEARL/USDG liquidity, claim-not-airdrop, T-016 now launch scope).
- Chainlink feeds only at launch; no holding or distributing Stock Tokens (T-017 is geo-gated and blocked on legal).
- CLAM invariants: redemption never pausable, reserve never withdrawable, reserve never deployed into yield, vault non-upgradeable, rounding favors the protocol.
- Prize pools pay only what fees fund; nothing tradable is minted against gameplay. Fee routing: ALL protocol fees (vault 2%/5%, marketplace 7%, later rakes) 100% to the prize pool (user decision 2026-08-16, was 50/50); treasury is funded only by the Gen-0 ops share and PEARL pre-sale ops share.
- Gen-0: 7,500, CLAM-priced (USDG direct, or ETH via Uniswap v3 SwapRouter02 `0xCaf681a66D020601342297493863E78C959E5cb2` at checkout; verified live 2026-08-16), sold from the project's own website; 30% pool / 70% ops.
- Marketplace: 7% protocol royalty enforced in the creature token on any venue; dormant, timelocked operator allowlist ships OFF; min-viable list/buy/cancel at launch (T-012a), no offers/auctions/swap until later.
- PEARL split 40 rewards / 15 pre-sale / 10 protocol-owned liquidity / 15 treasury / 12 team / 5 Founders / 3 advisors; primary pool PEARL/USDG Uniswap V3 1% tier, protocol-owned, locked 24+ months.
- No sub-account / scholarship systems, ever.

## Chain facts that bite

- Chain ID 4663 (testnet 46630), ETH gas, Arbitrum Nitro.
- USDG: `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`, 6 decimals.
- Use `ArbSys(0x64).arbBlockNumber()` or timestamps, never `block.number`.
- No VRF on this chain; randomness is commit-reveal; never blockhash or prevrandao.
- Feeds: read the proxy, call `decimals()`, check `updatedAt` staleness (86,400s heartbeat); only 35 of 96 tickers have feeds.
- Transactions can be silently dropped by sequencer screening; UX must time out and retry, never assume inclusion.
- Verify on Blockscout: `--verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api/` (testnet: `https://explorer.testnet.chain.robinhood.com/api/`).

## Layout

- `contracts/` Foundry (Solidity).
- `apps/web/` Next.js 16 + wagmi 3/viem (port 3100), account abstraction via Alchemy later (T-007); `/` proof of reserve, `/vault` wrap/redeem.
- `apps/indexer/` event indexer + leaderboard API.
- `packages/sdk/` shared addresses (`clamDeployment(chainId)`), ABIs (`npm run sync-abis` after `forge build`), feed registry.
- `packages/sim/` deterministic economy simulator (doc-syncs to ECONOMY.md; runs in CI).
- `packages/proto/` Anvil full-horizon replay (regression harness for contract changes), testnet bot fleet, local dashboard.
- `docs/` PRD, ARCHITECTURE (system map), tokenomics, PEARL-TOKENOMICS, tickets, ADRs, chain reference, economy reports.
- `docs/ECONOMY.md` is the single source of truth for all economic constants (contracts' `GameConstants.sol` and the sim both assert against it); `docs/ART-DIRECTION.md` for species/classes and motion design; `CONTEXT.md` at repo root is the domain glossary.

## Conventions

- Markdown: one sentence per line; no em or en dashes, plain hyphens only.
- Commits: no agent attribution trailers or footers.
- Every economic constant lives in one place with a test asserting its documented value.
- Tests assert external behavior; the ClamVault always keeps its invariant suite green.

## Related material outside this repo

- `../docs-archive/` recovered Crabada documentation (game mechanics to port, and the economic mistakes to avoid).
- `../resources/robinhood-chain/` verbatim chain doc archive backing the reference file.
