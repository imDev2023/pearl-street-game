# Pearl Street - Product Requirements Document

Status: approved for build (2026-08-13); economy proven by simulation and on-chain prototype, and launch scope re-cut, 2026-08-15 (see `docs/ARCHITECTURE.md` for the system map and frozen decisions).
Scope: the launch product = Gen-0 sale from our own site, the voyage game with the minimum-viable marketplace, and the PEARL pre-sale/claims a few days after go-live.
Later phases are summarized in Out of Scope and tracked as tickets.

## Problem Statement

Players who enjoyed idle P2E games like Crabada watched their earnings and assets collapse because the reward token (TUS) was minted without limit against gameplay, while every sink depended on new-player growth.
When growth stalled, emissions kept compounding and the token price sank permanently.
Players today want the same "my creatures work for me" loop, but they do not trust game economies that print their own reward token.
Separately, Robinhood Chain has real users, ~$354M of USDG, and tokenized-equity price feeds, but no game at all.
There is no product that turns watching the stock market, something this audience already does daily, into a game.

## Solution

Pearl Street is an idle creature game on Robinhood Chain where undersea creatures go on "trading voyages" whose outcomes are influenced by real stock prices read from Chainlink feeds.
Players buy and command creature NFTs, send parties of three on voyages keyed to real tickers, and compete on seasonal leaderboards for prizes.

The economy is built so that it cannot repeat the TUS collapse:

- The in-game money is CLAM, a fully-reserved wrapper over USDG with a 2% mint fee and a 5% redeem fee (revised 2026-08-15).
  CLAM cannot inflate (it is only minted against deposits) and cannot collapse (it is always redeemable against the reserve).
- The grind reward is Doubloons, a soulbound non-transferable currency.
  It absorbs play-to-earn pressure without creating sell pressure, because it cannot be sold.
- Prize pools are funded by real fee revenue and entry fees, never by minting.
- The speculative protocol token (PEARL) launches via pre-sale a few days after the game goes live, never before players and revenue exist (decided 2026-08-15; sequence in TOKENOMICS.md, allocation in PEARL-TOKENOMICS.md).
  Emissions are throttled by protocol revenue, 75% of the pre-sale seeds locked protocol-owned liquidity, and all PEARL is claimed through the site with vesting; there is no airdrop.

## User Stories

1. As a new player, I want to connect a wallet and start playing without holding ETH for gas, so that onboarding does not require understanding an L2.
2. As a new player, I want to convert USDG into CLAM in one step during my first purchase, so that I never face a separate "wrap your money" chore.
3. As a player, I want to buy a Gen-0 creature NFT with CLAM, so that I own the asset my gameplay is built on.
4. As a player, I want the Gen-0 collection to be capped, so that my early purchase keeps scarcity value.
5. As a player, I want to form a party of three creatures, so that team composition is a meaningful decision.
6. As a player, I want to send a party on a voyage keyed to a real stock ticker, so that my market opinion becomes gameplay.
7. As a player, I want voyage results to improve when the linked ticker performs well, so that outcomes feel connected to the real world rather than a hidden dice roll.
8. As a player, I want a fixed base reward on every voyage regardless of market movement, so that a red market day never feels like a total loss.
9. As a player, I want each creature limited by daily energy, so that bot farms cannot out-grind me simply by running all day.
10. As a player, I want to earn Doubloons from every voyage, so that consistent play visibly accumulates progression.
11. As a player, I want to spend Doubloons on upgrades and cosmetics, so that my grinding has somewhere satisfying to go.
12. As a player, I want a season leaderboard with CLAM prizes, so that skillful and consistent play earns real money from a real prize pot.
13. As a player, I want to see exactly how the prize pot is funded (fees, not minting), so that I can trust rewards are sustainable.
14. As a player, I want to redeem CLAM back to USDG at any time, so that my money is never trapped in the game.
15. As a player, I want on-chain proof that CLAM is fully reserved, so that I do not have to trust the team's word.
16. As a cautious player burned by Crabada, I want redemption to be technically impossible to pause, so that no admin can lock the exit.
17. As a player, I want voyage settlement to use tamper-resistant price data, so that outcomes cannot be manipulated.
18. As a player, I want to see my voyage history and results in a clean dashboard, so that I can track my performance over time.
19. As a competitive player, I want earnings-season in-game events, so that real market volatility creates special gameplay moments.
20. As a mobile-first player, I want the web app to work well on a phone, so that I can check voyages the way I check my portfolio.
21. As a whale, I want to run multiple parties concurrently (with capped team slots), so that deeper investment gives more engagement without breaking the economy.
22. As a marketer, I want a public tokenomics page with the anti-Crabada design explained, so that the trust story is a marketing asset.
23. As the prize pool, I want 2% of every CLAM mint and 5% of every redemption, so that money flowing in and out of the economy funds prizes.
24. As the protocol, I want all game actions priced in CLAM, so that the wrapper is the single money of the economy.
25. As a future PEARL holder, I want emissions bounded by protocol revenue, so that the token cannot hyperinflate.
26. As a compliance-conscious operator, I want the game to read stock prices from Chainlink feeds without holding or distributing Stock Tokens, so that securities restrictions do not apply to gameplay.
27. As an operator, I want the contracts designed so a geo-gated Stock Token staking feature can be added later, so that the roadmap is not blocked by early architecture.
28. As an operator, I want an indexer with a public API, so that leaderboards and stats load fast without hammering the RPC.
29. As an auditor, I want the CLAM vault to be small, non-upgradeable, and invariant-tested, so that the highest-stakes contract is the easiest to verify.
30. As a future player, I want looting PvP, tavern lending, breeding, raffles, and a marketplace, so that the full Crabada-style loop arrives over time.

## Implementation Decisions

Chain and infrastructure:

- Robinhood Chain mainnet (chain ID 4663), testnet 46630 first.
- ETH is gas; Alchemy is the RPC and account-abstraction provider.
- Account abstraction via ERC-4337 (EntryPoint v0.7.0) with sponsored gas for game actions.
- All contracts use `ArbSys(0x64).arbBlockNumber()` or timestamps, never `block.number`.
- No `prevrandao` or `blockhash` randomness anywhere; randomness (raffle, later features) uses commit-reveal, since no Chainlink VRF deployment exists on this chain.
- UX must tolerate silently dropped transactions (sequencer compliance screening): pending states time out and re-prompt rather than assuming eventual inclusion.

CLAM (the money):

- ERC-20, 6 decimals (matching USDG, ADR-0001), name "Pearl Street Clam", symbol CLAM.
- Minted and burned only by the ClamVault.
- Vault holds USDG (`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`, 6 decimals) as reserve.
- Mint: deposit X USDG, 2% fee skimmed in CLAM to the FeeRouter (100% to the prize pool), mint the remainder 1:1.
- Redeem: burn Y CLAM, 5% fee skimmed in CLAM to the FeeRouter (100% to the prize pool), pay out the remainder in USDG.
- Invariant: vault USDG balance == CLAM total supply, at all times (`reserveSurplus()` is the on-chain proof and always reads 0).
- All rounding favors the protocol (fees ceil).
- Neither redemption nor minting can be paused; the vault has no owner and no admin surface of any kind (ADR-0002).
- No function can move reserve except `redeem`; the fee percentages (2% mint, 5% redeem) are compile-time constants in `GameConstants.sol`, doc-asserted against `docs/ECONOMY.md`, with no setter and no upgrade path.
- The vault is non-upgradeable.
- Treasury and game contracts are fee-exempt.

Doubloons (the grind reward):

- Soulbound: non-transferable token, mintable only by game contracts, burnable by sinks.
- No DEX pool can ever exist; this is the anti-dump property and it is structural.

Creatures and voyages (Feature 1):

- Gen-0 creature collection: ERC-721, capped supply, minted in CLAM, mint revenue splits between prize pool and treasury.
- Each creature has a sector affinity mapping to feed-covered tickers (35 tickers have live Chainlink feeds; the design must handle feed absence and staleness).
- Parties of three; a voyage locks the party for a fixed epoch and is keyed to one ticker.
- Settlement reads the Chainlink feed (proxy address, `decimals()` respected, staleness-checked against the 86,400s heartbeat) at start and end; the signed price delta modifies the base reward within bounded min/max multipliers.
- Rewards: CLAM from the season prize pool plus Doubloons; the pool only pays out what it holds (no minting).
- Energy: each creature has a fixed daily energy budget; voyages consume energy; energy refills at 00:00 UTC.
- Team slots: players start with a capped number of concurrent parties; later tickets add purchasable permanent slots (ported from Crabada's CRAM slot sink).
- PEARL ships in launch scope (T-016). Stock Token staking does not exist in v1 code, but interfaces must not preclude it (power calculations live behind small upgrade-friendly seams).
- Marketplace: a minimum-viable fixed-price marketplace (list/buy/cancel) ships at launch (T-012a); the 7% royalty is enforced in the creature token on any venue; a dormant, timelocked operator allowlist ships OFF.

Monorepo:

- `contracts/` Foundry; `apps/web/` Next.js + wagmi/viem; `apps/indexer/` event indexer and leaderboard API; `packages/sdk/` shared addresses, ABIs, and the ticker/feed registry.

## Testing Decisions

- Tests assert external behavior (balances, events, reverts, invariants), not implementation details.
- The ClamVault gets the deepest coverage: unit tests for fee math (2%/5%, protocol-favoring rounding), fuzz tests for mint/redeem round trips, and a Foundry invariant suite for reserve == supply under arbitrary action sequences (CLAM is 6 decimals, matching USDG; the prototype's working decision).
- The economy simulator (`packages/sim`) doc-syncs to `docs/ECONOMY.md` and runs in CI; the Anvil replay (`packages/proto`) must keep matching it after every contract change.
- Voyage settlement is tested against a mock aggregator (fresh, stale, negative, zero, and paused-oracle price scenarios), plus fork tests pinned to Robinhood testnet reading real feeds.
- Energy and cooldown logic is tested across the 00:00 UTC boundary.
- E2E: anvil fork plus the web app for the full mint-CLAM, mint-creature, voyage, settle, claim path, mirroring how an end user experiences it.
- Every economic constant (fees, caps, multiplier bounds) lives in one place and has a test asserting its documented value.

## Out of Scope (v1)

- Looting PvP, tavern lending, breeding, marketplace swap and offers, raffle, team-slot sales, the burn-cap/retirement loop (each is its own ticket or design doc). Buyback-and-make for PEARL may follow the pre-sale rather than ship with it.
- Stock Token staking (geo-gated bolt-on; blocked on legal counsel).
- Mobile native apps; v1 is responsive web.
- Sub-account / scholarship systems: deliberately excluded, they industrialize extraction farming.
- DAO governance.

## Further Notes

- Legal review required before mainnet for: the CLAM wrapper (avoid the word "stablecoin" publicly), the raffle (gambling law), and any future Stock Token feature (securities restrictions: no US persons, limits in UK, Canada, Switzerland).
- Names: game "Pearl Street"; currencies CLAM, Doubloons, PEARL.
  Domains to register: pearlstreet.game, pearlstreet.gg, pearlstreet.xyz, playpearlstreet.com (all available as of 2026-08-14).
- Marketing beats: (1) first game on Robinhood Chain, (2) "the game money that cannot rug" (CLAM proof-of-reserve), (3) PEARL launches only after the game is live and earning, and 75% of the pre-sale goes into locked liquidity.
- Reference material lives in `docs/reference/ROBINHOOD-CHAIN.md` (verified chain facts) and the Crabada docs archive one directory above this repo.
