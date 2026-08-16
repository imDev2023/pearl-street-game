# T-012: Marketplace

Status: launch scope as a minimum-viable marketplace (user decision 2026-08-15); the escrowed swap and everything else stays post-launch
Blocked by: T-002 (CLAM), T-003 (creatures); ships with T-009

## Why it moved into launch scope

The simulation (`docs/BURN-CAP-DESIGN.md`) showed the marketplace fee is the best game-side refill source for the prize pool, and launch week (post-sale, pre-PEARL) is when secondary trading is heaviest.
The Founder scarcity story and the retirement/relic design both need a venue where creatures trade with the protocol taking its cut.
Fixed-price list/buy/cancel is smaller than the VoyageGame contract; it is a complete feature at that scope, not a half-built one.

## What to build for launch (minimum viable, complete at its scope)

- List a creature at a fixed CLAM price; buy; cancel. Nothing else.
- Protocol fee 7% (user decision 2026-08-15; constant in one place, doc-asserted like every other economic constant), routed through the existing FeeRouter (100% prize pool since 2026-08-16).
- The 7% is enforced IN THE CREATURE TOKEN as a transfer royalty, not only in the marketplace contract: any sale-shaped transfer (an operator moving the token, as opposed to an owner's plain wallet-to-wallet transfer) pays 7% of the sale price to the FeeRouter, so the fee is captured on any venue. The marketplace supplies the price; for operators that cannot supply one, the token falls back to a published floor-based minimum.
- Dormant operator allowlist in the creature token (decided 2026-08-15): an admin-maintained list of permitted operators (own marketplace, game escrow) with an `enforced` flag that defaults to OFF at launch, so tokens trade freely as a normal ERC-721. Toggling enforcement is a timelocked (48h, publicly visible) ops action so it can never trap holders instantly. It exists because the token is non-upgradeable: if the switch is not there at mint, it can never be added.
- Escrow the creature in the marketplace contract while listed (no approval-draining: the contract holds the token, and only the seller can cancel).
- Level or training state resets on transfer where later tickets introduce them (Crabada's auto-reset rule, simplified).
- Indexer: active listings, sales history, floor price per species.
- Web: browse, list, buy, cancel; one page.
- Sale-day note: Gen-0 will be listed for flips immediately; that is the fee, and it is paired with the hold-and-play incentives (leaderboard, Founder relics) rather than fought.

## Explicitly NOT in launch scope (post-launch, this same ticket continues)

- Offers and bids, auctions, bundles, royalties engine.
- The escrowed creature-for-creature swap with CLAM sweetener (Crabada's 888 TUS swap).
- Tavern lending (T-011) and anything rental-shaped.

## Acceptance criteria (launch)

- [ ] List, buy, cancel with exact fee routing (7%, split via FeeRouter) asserted to the micro-CLAM
- [ ] Royalty enforced in the creature token on operator transfers; plain owner transfers untaxed; tested against a third-party-marketplace-style operator
- [ ] Operator allowlist present, OFF by default, toggle timelocked 48h; tested both states, including that toggling never blocks an in-flight escrow cancel
- [ ] Marketplace holds listed creatures in escrow; only the seller can cancel; buyer receives the token atomically with payment
- [ ] No approval-draining or reentrancy paths (tested, including a malicious-token style attempt)
- [ ] Marketplace scenario in `packages/sim` cross-checked against the on-chain fee flow in the Anvil replay
- [ ] Indexer + web page live in the testnet run

## Acceptance criteria (post-launch continuation)

- [ ] Escrowed swap with both-sides confirmation and safe cancellation
- [ ] Offers/bids if the launch data shows demand

## Decisions from the launch-readiness map (2026-08-16)

- 7% routed via FeeRouter, 100% to the prize pool like every fee; royalty on the buy leg only, escrow exempt (`issues/17`, `issues/21`).
