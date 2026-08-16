# economy-contracts

Type: task
Status: resolved

## Question

Write the first-cut economy contracts (MockUSDG, CLAM+vault, FeeRouter, creatures, Doubloons, PrizePool, VoyageGame, mock feeds) with Foundry unit+invariant tests green.

## Answer

Done 2026-08-15. Ten contracts in `contracts/src/`: GameConstants (doc-asserted), ClamToken, Doubloons (soulbound, no transfer path), MockUSDG + MockAggregator (testnet has no USDG/feeds), ClamVault (no owner, no pause, reserve==supply by construction), FeeRouter (immutable 50/50 split), PrizePool (1.5%/day cap, game-only, once per day), LeaderboardPot (ops-posted settlement, flagged trust point), PearlCreatures (sale with 30/70 split, 15/wallet cap), VoyageGame (energy, day tranches, modifier-weighted claims, stale feed voids modifier per robinhood-4663 profile).
28/28 Foundry tests green including a 4-invariant stateful fuzz suite (~12.8K calls/action, zero reverts): reserve==supply, release cap, exact game escrow accounting, CLAM conservation.
Deploy via `script/DeployPrototype.s.sol` (DAY_LENGTH env drives Anvil vs testnet pacing).
