# T-013: Breeding

Status: backlog
Blocked by: T-012

## What to build

Controlled creature supply growth, with Crabada's recursion bug fixed.

Breeding costs CLAM (revenue, not burn-only) plus Doubloons, with escalating cost per breed count and a per-creature lifetime breed cap.
A season population cap bounds total new creatures regardless of demand.
Offspring inherit sector affinity and stats via commit-reveal genetics.
Old generations can retire into cosmetic relics (a sink that removes creatures from play).

## Acceptance criteria

- [ ] Escalating costs and lifetime caps enforced on-chain
- [ ] Season population cap cannot be exceeded
- [ ] Genetics are unpredictable pre-reveal and deterministic post-reveal
- [ ] Retirement burn removes the creature and issues the relic
