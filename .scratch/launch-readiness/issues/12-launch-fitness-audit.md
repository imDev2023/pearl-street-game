# Launch-fitness audit of the repo
Type: research
Status: resolved
Blocked by: -

## Question
Go through tickets, architecture, contracts, tests, CI, packages and apps: is the project set up properly, is the tech stack sufficient (only strictly necessary additions), and what game mechanics or money flows are missing or contradictory? Findings graduate into decision tickets.

## Answer
Full findings: `../assets/launch-fitness-audit-2026-08-16.md`.
Setup is structurally right but pre-commit: no remote/CI run, thin CI, prototype deploy scripts, stale docs (18 decimals, 1%/1% fees, guardian pause, website PEARL/Berths copy).
Tech stack sufficient; strictly necessary additions: keeper (release/settle/sweep), commit-reveal revealer, indexer framework + merkle builder, monitoring, hardware-wallet deploy, testnet faucet, Slither in CI.
Sharp gaps graduated to tickets 14-19; build-level findings folded into the affected build tickets in `docs/tickets/`.
Worst contract finding: LeaderboardPot ops settlement is an uncapped rug surface (ticket 15).
