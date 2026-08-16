# T-005: Doubloons and the energy system

Status: ready
Blocked by: T-004

## Starting point

`contracts/src/tokens/Doubloons.sol` (soulbound by construction, credit/spend only) and the energy logic inside `VoyageGame.sol` (24/day, 8 per voyage, day-boundary refill keyed to the game genesis) from the economy prototype.
This ticket adds the sinks and the UI; the anti-bot spine already exists and is tested.

## What to build

The anti-botting and progression layer, demoable as: energy limits how many voyages a creature runs per day, and Doubloons visibly accumulate and get spent.

Doubloons are a soulbound token: no transfer, no approval, minted only by game contracts, burned by sinks.
Voyages consume creature energy from a fixed daily budget refilled at 00:00 UTC (Crabada added this cap too late; we ship it day one).
First Doubloon sinks: creature stat training and at least one cosmetic, so the earn-spend loop is closed at launch.
Voyage settlement from T-004 switches from event-stub to real Doubloon minting.

## Acceptance criteria

- [ ] Transfer and approval of Doubloons revert; only game contracts can mint
- [ ] Energy budget enforced on-chain; refill boundary tested across 00:00 UTC
- [ ] At least two working Doubloon sinks with burn on spend
- [ ] Web app shows energy bars, Doubloon balance, and sink UI
- [ ] Documented per-creature daily output cap holds under fuzz
