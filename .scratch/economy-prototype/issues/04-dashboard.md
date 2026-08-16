# dashboard

Type: task
Status: resolved
Blocked by: 03

## Question

Local live dashboard (viem polling testnet): pool, per-player P&L min/max/avg, protocol revenue, voyage activity; artifact snapshot at the end.

## Answer

Built 2026-08-15: `packages/proto/scripts/dashboard-server.mjs` (localhost:4173) + `packages/proto/dashboard/index.html`.
Live chain reads (pool, vault invariant, supply, treasury revenue, leaderboard pot, voyages) plus the bot fleet's state file (per-player lifetime hauls vs entry cost, min/avg/max, payback %, pool chart).
Verified rendering headlessly: 7 tiles live, zero console errors.
Static artifact snapshot ships with the final report (ticket 05).
