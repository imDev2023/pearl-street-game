# Reconcile docs and site copy to decided values
Type: task
Status: resolved
Blocked by: -

## Question
PRD, TOKENOMICS, ECONOMY-PROTOTYPE-REPORT, ClamVault comments and website copy still say 18 decimals, 1%/1% fees, guardian pause, "no PEARL sale", Stock-Token Berths.
Bring every doc to the decided values (6 decimals, 2%/5%, no pause, PEARL pre-sale sequence, no Stock Tokens at launch) so the build tickets read one truth. AFK, unblocks nothing but prevents a build session from following a stale rule.

## Answer
Done 2026-08-16. Reconciled: PRD (6 decimals, 2%/5% compile-time fees, no pause of any kind, reserve == supply, story 23), TOKENOMICS (decimals, routing, ops wallet), ECONOMY (100% routing, ops wallet), CONTEXT (ops role, fee router), ClamVault comments, FeeRouter comment, both economy reports (historical notes), website copy (fees, 100% routing, ops wallet, PEARL pre-sale sequence, no legal-review clause, DEX band).
Applied the same day: GameConstants/sim FEES_TO_POOL_BPS = 10_000 with tests updated; forge 28/28, sim 16/16.
Left for T-016: the whitepaper PEARL chapter (fee share, floor reserve, seats) pending ticket 22; the Berths chapter stays as an explicitly region-gated, post-launch feature.
