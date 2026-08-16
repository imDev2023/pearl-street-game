# Pearl Street Architecture

The system map for the build.
Read this after `PRD.md` and before opening any ticket; it says what exists, what each piece owns, how money moves, and which decisions are frozen.
Status: written 2026-08-15 at the end of the economy-prototype phase; the prototype contracts in `contracts/src/` are the starting point for every launch ticket, not throwaway.

## One paragraph

Players wrap USDG into CLAM (the game money), buy Gen-0 creatures with CLAM from the project's own site, and send parties of up to three on voyages against Chainlink equity feeds.
A prize pool seeded by 30% of the sale and refilled by 100% of all protocol fees releases at most 1.5% of its balance per game day, 80% to that day's voyages (weighted by a hard-capped market modifier) and 20% to a season leaderboard pot.
Play also earns soulbound Doubloons.
A few days after launch, PEARL (the one tradable token) is pre-sold; 75% of proceeds seed a locked PEARL/USDG Uniswap V3 pool, PEARL play rewards emit throttled to 25% of trailing revenue, and Founders claim their allocation through play.
Nothing tradable is ever minted against gameplay; the vault is run-proof by construction.

## Layers and ownership

| Layer | Location | Owns | Status |
| --- | --- | --- | --- |
| Contracts | `contracts/` (Foundry, solc 0.8.30, cancun) | All money, all rules, all invariants | First-cut prototype done; 28 tests incl. invariant fuzzing; production hardening is the launch work |
| SDK | `packages/sdk/` | Chain constants, feed registry (35 tickers), ABIs and addresses once deployed | Done for chain + feeds; ABIs/addresses added per ticket |
| Simulator | `packages/sim/` | The economic model; doc-syncs to `docs/ECONOMY.md`; scenario suite in CI | Done; extend when rules change |
| Prototype drivers | `packages/proto/` | Anvil full-horizon replay, testnet bot fleet, local dashboard | Done; reuse the replay as the regression harness for every contract change |
| Indexer | `apps/indexer/` | Events -> leaderboard, listings, floor prices, player stats; public API | Placeholder |
| Web | `apps/web/` (Next.js, wagmi/viem, Alchemy AA) | Mint page, vault page, party/voyage UI, marketplace page, PEARL claim page, proof-of-reserve | Placeholder; the pre-sale site in `website/` is the visual reference |

## Contract map (prototype, `contracts/src/`)

```text
MockUSDG (testnet only) ---deposit/redeem---> ClamVault ---mint/burn---> ClamToken
                                                  |  fees (2% in / 5% out, in CLAM)
                                                  v
                                             FeeRouter --100%-> PrizePool --release() 1.5%/day--> VoyageGame --claim--> players
                                                  |  --0%---> Treasury (leg kept)     |                       (80% of release)
                                                  |                                    +--> LeaderboardPot (20% of release)
PearlCreatures --buyGen0 (30% pool / 70% ops)-----+
      ^                                                       Doubloons <--credit-- VoyageGame
      | ownerOf / sectorOf                                     (soulbound, no transfer fn)
      +---- VoyageGame (party validation, energy)
MockAggregator x8 (testnet) / Chainlink proxies x35 (mainnet) --latestRoundData--> VoyageGame
```

Per contract, what it owns and what is frozen:

- `GameConstants.sol`: every economic constant, asserted against `docs/ECONOMY.md` by `test/GameConstants.t.sol`; the simulator doc-syncs to the same document. Change the doc first, then this file, then the sim; the tests fail until all three agree.
- `ClamToken` + `ClamVault`: reserve == supply at all times; no owner, no pause, no withdraw path; fees skimmed in CLAM at the edges only; rounding favors the protocol. `reserveSurplus()` is the on-chain proof of reserve. Frozen by user decision; do not add admin surface.
- `FeeRouter`: single sink for all fee CLAM; immutable split from GameConstants (100% PrizePool); anyone can `flush()`.
- `PrizePool`: game-only `release()`, once per game day, at most 1.5% of current balance, 80/20 to VoyageGame/LeaderboardPot; no other outflow. Timestamp clock, never `block.number`.
- `PearlCreatures`: Gen-0 sale (7,500; 100 CLAM / 80 allowlist; 15 per wallet; 30/70 split); species by id, sector by hash. Launch additions (T-003): commit-reveal stats, the 7% in-token royalty on operator transfers, and the dormant timelocked operator allowlist. Non-upgradeable, so all three must ship at mint.
- `VoyageGame`: energy (24/day, 8 per voyage, day-boundary refill), day tranches, modifier 0.7x-1.3x (+10% affinity), stale feed voids the modifier and pays base, claims D+2..D+9, dust sweeps back to the pool. The single canonical price-reading path; never multiply by `uiMultiplier` (feeds already return the full token price).
- `Doubloons`: soulbound by construction; only the game credits, only sinks spend.
- `LeaderboardPot`: ops-posted season payout in the prototype; production wants indexer-computed merkle distribution (T-006).
- Mocks: `MockUSDG`, `MockAggregator` exist because testnet 46630 has neither USDG nor Chainlink feeds; mainnet uses the real ones.

Contracts still to write (launch scope): `Marketplace` (T-012a: list/buy/cancel escrow, fee via FeeRouter), `PearlToken` + `PearlPresale` + `PearlVesting`/claim + emission controller + floor reserve (T-016), the timelock for the operator allowlist and other ops actions, and the AA/paymaster wiring (T-007).

## Money flows (the economic circuit)

- In: USDG deposits (2% fee), Gen-0 sale (30% pool / 70% ops), marketplace royalty 7%, later looting rake and other sinks, PEARL pre-sale (75% liquidity / 25% ops), protocol-owned LP swap fees.
- Fee routing: every protocol fee -> FeeRouter -> 100% PrizePool (revised 2026-08-16 from 50/50; the treasury leg of FeeRouter stays wired but receives 0 under the constant).
- Out to players: PrizePool release only (hauls + leaderboard); PEARL emission throttled to 25% of trailing-7-day revenue; loot moves player to player.
- Out of the system: vault redeem only (5% fee), which burns CLAM against equal USDG.
- Invariants asserted in tests and the sim: pool never negative and never above the daily cap; reserve == supply; game escrow exact; CLAM conservation; gameplay payouts <= pool inflows; Doubloons never become CLAM; PEARL emission never above the throttle.

## Clocks, randomness, oracles (chain facts that shaped the code)

- Arbitrum Nitro: `block.number` is an L1 estimate; all game time is `block.timestamp` (day = `(now - genesis) / dayLength`).
- No VRF and `prevrandao` is constant: creature stats use commit-reveal (T-003); nothing draws from chain attributes.
- Feeds: 35 equity proxies, 8 decimals, 24h heartbeat, no off-hours heartbeat, no sequencer uptime feed on 4663. Staleness voids the modifier and pays base; settlement never reverts on staleness. Read the standard proxy (SVR is for liquidation-shaped modules).
- Sequencer can drop transactions silently: every client send times out and retries; never assume inclusion (the testnet driver already does this).
- FCFS ordering, no priority auction: loot windows and claim windows are designed on time, not gas.
- USDG has 6 decimals; CLAM matches (6 decimals) in the prototype. The older docs said 18; the prototype's 6-decimal choice avoids a scaling seam and is the working decision unless the user objects.

## Launch sequence (decided 2026-08-15)

1. Gen-0 sale from the project's own website (`PearlCreatures.buyGen0`), CLAM-priced; ETH accepted only via a swap at checkout.
2. Three to four days of live game on CLAM + Doubloons; marketplace open (list/buy/cancel).
3. PEARL pre-sale (a few days).
4. Protocol pairs 75% of pre-sale proceeds with PEARL into the locked PEARL/USDG Uniswap V3 pool (1% fee tier, full range, timelocked 24+ months); trading opens.
5. Claims open on the website for pre-sale buyers and Founder allocations, one vesting contract (about 14 days, instant claim burns 50%). No airdrop.

## Build order (recommended start for the next session)

1. T-002 CLAM vault: harden the prototype vault (already invariant-tested) into the production contract; proof-of-reserve page.
2. T-003 creature mint: commit-reveal, in-token 7% royalty, dormant operator allowlist, allowlist pricing; non-upgradeable, so this is the ticket to get exactly right.
3. T-004 voyages + T-005 energy/Doubloons: the prototype `VoyageGame` split into production pieces, fork-tested against real testnet feeds.
4. T-012a marketplace: list/buy/cancel escrow, fee via FeeRouter.
5. T-016 PEARL contracts in parallel once T-002 exists: token, pre-sale, vesting/claim, emission controller, floor reserve, V3 position + timelock.
6. T-006 indexer/leaderboard, T-007 gasless onboarding, then T-008 playtest/audit and T-009 mainnet.
Reuse `packages/proto/scripts/replay-anvil.mjs` as the regression harness for every contract change: it must keep matching the simulator.

## Decisions frozen today (do not relitigate without the user)

- Vault fees 2% mint / 5% redeem; all fee routing 100% to the prize pool (revised 2026-08-16, was 50/50).
- Marketplace 7% royalty enforced in-token; dormant timelocked operator allowlist, OFF at launch.
- Gen-0 7,500, CLAM-priced, sold from own site.
- PEARL: launch sequence above; split 40/15/10/15/12/5/3; claim-not-airdrop; Founder allocation vests through Season One play; PEARL/USDG V3 at 1% as the primary, protocol-owned, locked pool.
- Scope: launch = T-002..T-009 + T-012a + T-016. Breeding, tavern, insurance, team slots, raffle, stock tokens, offers/auctions/swap: later.

## Open decisions (user's, listed so nobody guesses)

- PEARL pre-sale price and size (the matrix in `PEARL-TOKENOMICS.md` recommends ~$25M FDV; user has not chosen).
- Trading-volume assumption to plan around.
- Burn cap / retirement design (in `BURN-CAP-DESIGN.md`; not in launch scope, not decided).
- Season length (90 days assumed), leaderboard payout curve (top 20% pro-rata assumed), modifier amplification (x10 assumed).
- CLAM decimals: 6 (prototype) vs 18 (older docs).
