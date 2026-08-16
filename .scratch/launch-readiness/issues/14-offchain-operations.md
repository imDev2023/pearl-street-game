# Off-chain operations: keeper, revealer, monitoring
Type: grilling
Status: resolved
Blocked by: -

## Question
Who runs the daily release/settle/sweep keeper, the commit-reveal revealer, and the alerting (reserve, feeds, pool, indexer lag); where does it run (Cloudflare Worker cron, a VPS, GitHub Actions cron); what happens to a game day nobody pokes; and which ticket owns each (T-004, T-003, T-009).

## Answer
Default taken 2026-08-16 (operator skipped the question after agreeing that skipped items take the recommendation; may be overridden any time before the relevant ticket ships).
A Cloudflare Worker cron with a dust-funded hot key calls `poke()`/`release()`, `settle()` inside its window, and per-day `sweep()`; anyone can still poke as the fallback, and a missed day simply retains that day's release in the pool (documented player-facing).
The same worker runs the commit-reveal revealer for T-003 and pushes alerts (reserve, feed staleness, pool balance, indexer lag).
Owned by T-004 (keeper), T-003 (revealer), T-009 (alerting).
