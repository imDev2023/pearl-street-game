# Equity feeds: market hours and ticker set
Type: grilling
Status: resolved
Blocked by: -

## Question
If equity voyages are in the launch loop: weekend/off-hours behaviour (feeds have no off-hours heartbeat, so stale = base haul) and the launch ticker set (35 feed-covered tickers, additions timelocked?).
If they are not, this ticket is ruled out of scope for this map.

## Answer
Default taken 2026-08-16 (operator skipped the question after agreeing that skipped items take the recommendation; may be overridden any time before the relevant ticket ships).
Weekends and off-hours: voyages keep running; a stale feed voids the modifier and pays base haul, shown in-game as "calm seas".
Ticker set: the 35 feed-covered names at launch; additions and retirements go through the same 48h timelock as the operator allowlist (T-004 adds a `live` setter behind it).
