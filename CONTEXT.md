# Pearl Street - Domain Glossary

Terms of the game economy, as used in code, docs, and conversation.
Glossary only; constants live in `docs/ECONOMY.md`, decisions in `docs/adr/` and the tickets.

- **CLAM**: the game's hard currency, a USDG-backed wrapped stable minted and burned only by the Vault, always 1:1 with reserve.
- **Vault**: the only mint/redeem edge for CLAM; skims fees in CLAM at the edges and holds USDG reserve equal to CLAM supply at all times.
- **Doubloon**: the soulbound grind currency; earnable through play, spendable on sinks, never transferable and never convertible to anything tradable.
- **Creature**: a Gen-0 (or later Gen-1) NFT with a species (class) and a sector affinity, the unit of play.
- **Party**: up to three creatures voyaging together for one player.
- **Voyage**: one party sailing against one ticker for one leg; costs 8 energy per creature; its haul share is decided by the market modifier.
- **Leg**: one third of a game day (8 hours at real pace); the duration of a voyage.
- **Game day**: the economy's clock tick; 86,400s in production pacing, compressible (600s on the testnet prototype) without changing any rule.
- **Energy**: the per-creature daily action budget (24, refilling at the day boundary); the anti-bot spine.
- **Ticker**: a feed-covered equity symbol a voyage can sail against; carries a sector.
- **Sector**: the affinity dimension linking creatures to tickers; a party sector match earns the affinity bonus.
- **Market modifier**: the signed feed delta over a voyage, amplified and hard-capped to 0.7x-1.3x; redistributes hauls between voyages but never changes total emission; a stale feed voids it (base haul).
- **Prize pool**: the season's CLAM reservoir; releases at most 1.5% of its current balance per day, and that release is the only way CLAM leaves it.
- **Release**: the pool's daily outflow; splits 80% haul tranche / 20% leaderboard pot.
- **Tranche**: the day's haul budget held by the game for that day's voyages, distributed pro-rata by modifier weight at claim time.
- **Claim window**: days D+2 through D+9 for a day-D voyage; weights are final when it opens.
- **Sweep**: returning a day's unclaimed tranche remainder (dust and expired claims) to the pool after the claim window closes.
- **Leaderboard pot**: the 20% release share accruing until season end, then paid to the top players by season Doubloons.
- **Season**: the leaderboard accounting period (90 game days, prototype assumption pending a documented decision).
- **Ops**: the operations role (the operator's deployer wallet): feed registry, allowlist, season settlement posting; never able to touch the vault or pause redemption.
- **Fee router**: the single sink where all protocol fee CLAM lands before being forwarded, in full, to the prize pool.
- **Archetype**: a modeled player style (casual, skilled, bot/whale) with an energy efficiency and a redeem propensity; simulation and fleet vocabulary, not a contract concept.
