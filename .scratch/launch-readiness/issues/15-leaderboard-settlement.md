# Leaderboard settlement trust model
Type: grilling
Status: resolved
Blocked by: -

## Question
`LeaderboardPot.settleSeason` lets ops post arbitrary payees and amounts, repeatedly, with no cap: a rug surface.
Decide the launch model: (a) indexer-computed merkle root posted once per season, claim-based (T-006 aspiration); (b) ops posting kept but one-shot per season and capped at the season accrual; (c) something else. Also who verifies the root.

## Answer
Default taken 2026-08-16 (operator skipped the question after agreeing that skipped items take the recommendation; may be overridden any time before the relevant ticket ships).
One merkle root per season computed by the indexer, posted once, capped at the season's accrued pot, claim-based; ops-posted arbitrary lists are removed from LeaderboardPot (T-006 + T-004 contract change).
