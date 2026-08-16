# Ticket Index

Tickets are tracer-bullet vertical slices: each one cuts through contracts, tests, indexer, and UI, and is demoable on its own.
Work them in dependency order.
Read `docs/ARCHITECTURE.md` first: it maps the prototype contracts each ticket starts from and the decisions frozen on 2026-08-15.
Next unit: **T-002 CLAM vault** - the economy prototype gate is passed (user decision 2026-08-15) and the launch decisions are recorded in `.scratch/launch-readiness/map.md` (2026-08-16); build starts with the doc reconciliation task there, then T-002.
Update the Status line inside each ticket as work progresses (ready / in progress / done / backlog).

## Launch scope (Gen-0 sale, live game, PEARL pre-sale)

| Ticket | Title | Blocked by |
| --- | --- | --- |
| T-001 | Repo and CI bootstrap (done 2026-08-15) | - |
| T-018 | Economy stress test + on-chain prototype (done 2026-08-15; reports in docs/) | T-001 |
| T-002 | CLAM token and vault (START HERE) | T-018 |
| T-003 | Gen-0 creature mint (commit-reveal, 7% in-token royalty, dormant operator allowlist) | T-002 |
| T-004 | Trading voyages | T-003 |
| T-005 | Doubloons and energy | T-004 |
| T-006 | Indexer and leaderboard | T-004 |
| T-007 | Gasless onboarding | T-002, T-003 |
| T-012a | Minimum-viable marketplace: list/buy/cancel (see T-012) | T-002, T-003 |
| T-016 | PEARL token, pre-sale, locked liquidity, claims | T-002, T-004, risk disclosure (no legal gate, 2026-08-16) |
| T-008 | Playtest and security review | T-005, T-006, T-007, T-012a, T-016 |
| T-009 | Mainnet launch (the decided launch sequence) | T-008 |

## Post-launch scope

| Ticket | Title | Blocked by |
| --- | --- | --- |
| T-010 | Looting PvP | T-009 |
| T-011 | Tavern | T-010 |
| T-012 | Marketplace continuation: escrowed swap, offers | T-009 |
| T-013 | Breeding | T-012 |
| T-014 | Team slots | T-009 |
| T-015 | Weekly raffle | T-009 + legal |
| T-017 | Stock Token staking | T-009 + legal |
| - | Burn cap / retirement loop (design in docs/BURN-CAP-DESIGN.md, not decided) | user decision |
