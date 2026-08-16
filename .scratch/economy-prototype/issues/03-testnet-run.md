# testnet-run

Type: task
Status: resolved
Blocked by: 01

## Question

Deploy to testnet 46630 (10-min game days), fund ~24 bot wallets from main, run ~30 players across archetypes for 36+ game-days.

## Answer

Deployed 2026-08-15 to testnet 46630 (record in `assets/testnet-deployment.json`), 24 bot wallets generated + gas-funded from the main wallet, 30-player fleet running at 10-minute game days with mainnet-mirrored prices; healthy at day 5+ (382 voyages, vault surplus 0).
Real-network finding: a slow leg can straddle a day boundary; the contract correctly refused mis-attributed claims and the driver was fixed to trust the chain's day. Fleet keeps running for the season sample; state in `assets/testnet-state.json`.
