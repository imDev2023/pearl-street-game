# anvil-replay

Type: task
Status: resolved
Blocked by: 01

## Question

Replay the economy full-horizon on Anvil with time warping; diff pool/vault/treasury aggregates day-by-day against a matching packages/sim scenario; statistical check on player yields.

## Answer

Done 2026-08-15: `packages/proto/scripts/replay-anvil.mjs` ran 120 game days against the real contracts (30 players, 135 creatures, all regimes) on a dedicated Anvil (port 9556); every invariant held every day; pool trajectory matched the T-018 simulator within 0.03%.
Casual/skilled/bot recovered 14/24/27% of entry over 120 days. Full tables in `docs/ECONOMY-PROTOTYPE-REPORT.md`; raw data in `assets/anvil-replay.json`.
