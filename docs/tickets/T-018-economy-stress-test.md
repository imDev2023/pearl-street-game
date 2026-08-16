# T-018: Economy stress test and end-to-end viability check

Status: done 2026-08-15 - simulator, stress report, on-chain prototype (contracts, Anvil replay, live testnet run), and prototype report complete; user decision: launch Gen-0 and learn from real numbers rather than gate further on modeling
Blocked by: T-001 (done)

## Why this is next (user decision, 2026-08-15)

The economy is the core engine, and the user wants proof it is viable, reliable, and working as designed BEFORE any more contracts or features are built.
T-002 and everything downstream is blocked on this ticket until the economy passes.

## What to build

A deterministic off-chain economy simulator (suggested home: `packages/sim`, TypeScript, seeded RNG) that executes the full economic loop from `docs/ECONOMY.md`, plus a scenario suite that tries to break it.
`docs/ECONOMY.md` is the single source of truth for every constant; the simulator must import or assert against those documented values, never restate them.

Simulate, per day-tick, at minimum:

- Gen-0 sale proceeds split into the Season One pool and ops.
- Daily pool release capped at 1.5% of balance, split 80% voyage hauls / 20% leaderboard pot.
- Energy budgets (24/day) and voyage costs (8 energy / 8 hours) per creature.
- Market modifier (0.7x to 1.3x) driven by synthetic and historical-shaped feed series, including flat, bull, crash, and whipsaw regimes.
- Fee flows: CLAM vault 2% mint + 5% redeem (was 1%/1% when this ticket was written), and 50% of all protocol fees refilling the pool.
- Player population dynamics: growth, stagnation, collapse, whale concentration, and bot fleets running max-efficiency rosters.
- Breeding supply (Gen-1 cap 5,000/season) once creatures enter the yield base.

## Scenario suite (the stress part)

- The Crabada death-spiral replay: reward-driven inflows collapse; verify yields shrink smoothly instead of the pool breaking.
- Mass exit: a large fraction of players redeem CLAM at once; the vault must stay solvent by construction (reserve == supply, fees at edges).
- Whale and bot pressure: capital and automation try to extract more than their capped share.
- No-growth world: zero new players after launch; report how long yields stay non-zero (they must never hit a broken promise, only smaller shares).
- Boom-bust market: feed regimes swinging the 0.7x-1.3x modifier; verify the modifier changes distribution, not total emission.

## Invariants to assert in code (fail the suite if violated)

- The pool balance never goes negative and never releases more than the daily cap.
- Nothing tradable is ever minted against gameplay; every CLAM paid out is a share of something previously paid in.
- Vault invariant holds at all times: reserve == CLAM supply, fees skimmed only at the edges.
- Doubloons never leak into anything tradable.

## Acceptance criteria

- [x] Simulator runs all scenarios deterministically from seeds, in CI, as part of `npm test` (`packages/sim`, 2026-08-15)
- [x] Every invariant above is asserted and green across all scenarios (asserted after every simulated day in `engine.ts`)
- [x] A written report (`docs/ECONOMY-STRESS-REPORT.md`) with charts or tables per scenario: pool trajectory, per-creature daily yield, payback period vs mint price, and the shape of decline in the no-growth world
- [x] Any constant in `docs/ECONOMY.md` that the simulation shows to be unsafe is flagged with a concrete proposed change (see the report's "Flagged constants and proposals" section; nothing was changed)
- [x] The user reviewed the reports and decided (2026-08-15) to proceed to build: launch Gen-0, observe real volume, iterate; T-002 unblocked

## Open questions for the operator

- What is the viability bar? Propose: with zero growth after launch, per-creature daily yield stays above dust for >= 180 days and the pool never pays out more than it holds. Confirm or set your own thresholds.
- What payback-period range for a 100 CLAM Gen-0 mint do you consider healthy vs pathological (too-fast payback is the classic death-spiral smell)?
- Should the simulator also model the secondary market price of creatures (a speculation layer), or is protocol-flow viability enough for this gate?
- Historical feed data: is synthetic-only acceptable for this pass, or do you want real historical daily closes wired in for the 35 tickers?
