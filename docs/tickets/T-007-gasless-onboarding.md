# T-007: Gasless onboarding

Status: ready
Blocked by: T-002, T-003

## What to build

The "no ETH required" first-run experience, demoable as: a fresh wallet with only USDG plays the whole first session without ever seeing a gas prompt.

Account abstraction via ERC-4337 (EntryPoint v0.7.0, Alchemy) with sponsored gas for whitelisted game actions.
The first purchase bundles approve, CLAM mint, and creature mint into one user operation, so the 2% wrap fee is invisible friction instead of a separate chore; optionally a swap step so a buyer holding ETH can pay (CLAM pricing stays canonical).
Session keys for routine actions (start voyage, claim) so repeat play does not re-prompt signatures.
Pending-operation UX must handle sequencer-dropped transactions with timeouts and retry prompts.

## Acceptance criteria

- [ ] Fresh wallet with USDG only: buys a creature in one confirmation, zero ETH
- [ ] Sponsored actions are whitelisted and rate-limited per account
- [ ] Session-key play: start and claim voyages without per-action wallet popups
- [ ] Dropped-transaction path shows a timeout and safe retry, never a stuck spinner

## Decisions from the launch-readiness map (2026-08-16)

- Sponsor first wrap, mint, and first 3 voyages per wallet; hard per-wallet cap; paymaster funded from the ops share of Gen-0 (`issues/19`).
