# T-003: Gen-0 creature mint

Status: ready
Blocked by: T-002

## Starting point

`contracts/src/PearlCreatures.sol` from the economy prototype (sale, 30/70 split, wallet cap, allowlist pricing, deterministic species/sector, minimal ERC-721), covered by `test/VoyageGame.t.sol` and the invariant suite.
Replace deterministic stats with commit-reveal, add the in-token royalty and the dormant operator allowlist, and keep everything else.
This contract is non-upgradeable: whatever ships at mint is final.

## What to build

A capped Gen-0 ERC-721 collection purchasable with CLAM, demoable as: connect, pay CLAM, see your creature with its traits.

Each creature has a species (fixed at mint: 1,500 each of Octopus, Shark, Turtle, Seahorse, Pufferfish), a sector affinity (mapping to the feed-covered tickers), and base stats rolled at reveal.
Defaults per docs/ECONOMY.md: supply 7,500, price 100 CLAM (80 allowlist), 15 per wallet, proceeds 30% to Season One prize pool and 70% to the operations multisig.
Metadata served from the indexer or static host with on-chain trait hashes, so art can iterate without contract changes.
Mint randomness uses commit-reveal (no VRF exists on this chain); the reveal path must not trust `blockhash` or `prevrandao`.

Token-side marketplace requirements (user decisions 2026-08-15, because the token is non-upgradeable and these cannot be added later):

- A 7% transfer royalty enforced in the token on sale-shaped transfers (operator-initiated moves), paid to the FeeRouter; plain owner-initiated wallet-to-wallet transfers are untaxed. The marketplace passes the sale price; operators that cannot are charged against a published floor-based minimum.
- A dormant operator allowlist: permitted operators (own marketplace, game escrow) with an `enforced` flag OFF at launch, so the token behaves as a normal ERC-721; toggling is a 48h-timelocked, publicly visible ops action, reversible, and must never block an in-flight escrow cancel.
- The sale itself runs from the project's own website against this contract (no launchpad).

## Acceptance criteria

- [ ] Capped supply enforced on-chain; mint reverts when sold out
- [ ] Mint pays CLAM and the split to prize pool and treasury is exact
- [ ] Traits are assigned via commit-reveal and cannot be predicted or re-rolled
- [ ] Wallet and web app display the creature with sector affinity and stats
- [ ] Fuzz tests cover mint pricing, supply cap, and split math
- [ ] 7% royalty charged on operator transfers and not on owner transfers, routed exactly to the FeeRouter (tested against a third-party-marketplace-style operator)
- [ ] Operator allowlist ships OFF; toggling is timelocked 48h; both states tested

## Decisions from the launch-readiness map (2026-08-16)

- Royalty is charged only on the buy leg of a sale; transfers into and out of the marketplace escrow are exempt; the allowlist must never block an in-flight cancel (`.scratch/launch-readiness/issues/17`).
- The commit-reveal revealer runs in the ops keeper worker (`issues/14`).
- The token must be a complete ERC-721 (ERC-165, `tokenURI`, `safeTransferFrom`, ERC-2981) so wallets and venues display it (audit finding).
- Checkout: accept USDG directly and ETH via Uniswap v3 SwapRouter02 `exactOutputSingle` (WETH->USDG, fee 100), addresses in `.scratch/launch-readiness/issues/16`.
