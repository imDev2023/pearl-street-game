# T-010: Looting PvP

Status: backlog
Blocked by: T-009

## What to build

Crabada's signature mechanic, ported: raid another player's active voyage during its vulnerability window, with reinforcements and a bounded steal percentage.

Combat resolves on party stats plus reinforcements, with a Miner's Revenge-style underdog chance for defenders.
Loot insurance is a new CLAM sink: pay a premium to shrink the vulnerability window.
FCFS sequencing on this chain means loot sniping cannot be won by gas bidding; design target windows accordingly.
Only base rewards are stealable; Doubloons and modifiers are not (ported rule from Crabada).

## Acceptance criteria

- [ ] Raids work end to end on testnet with reinforcement rounds
- [ ] Steal percentage bounded and tested; defender underdog mechanic verified statistically
- [ ] Insurance premium sink live and accounted to the prize pool and treasury
- [ ] Each voyage lootable at most once
