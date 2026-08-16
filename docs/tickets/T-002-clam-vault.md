# T-002: CLAM token and vault, end to end

Status: ready - START HERE; open questions below were resolved 2026-08-16 (6 decimals ADR-0001, no pause ADR-0002, hardware EOA treasury) in `.scratch/launch-readiness/`
Blocked by: T-001 (done); the economy prototype gate is passed (user decision 2026-08-15: launch Gen-0 and learn from real numbers)

## Starting point

`contracts/src/ClamVault.sol`, `tokens/ClamToken.sol`, `FeeRouter.sol` from the economy prototype, already covered by `test/ClamVault.t.sol` and the 4-invariant stateful suite in `test/Invariants.t.sol` (28/28 green).
This ticket hardens them into the production contracts; it does not start from scratch.

## What to build

The money of the game, demoable on testnet: a user can wrap USDG into CLAM, see it in their wallet, and redeem back to USDG.

- CLAM is an ERC-20 with 6 decimals (matching USDG; the prototype's working decision, no scaling seam), mintable and burnable only by the ClamVault; the vault address is set once and never changes.
- Deposit USDG, skim the 2% mint fee in CLAM to the FeeRouter, mint the remainder 1:1. Redeem burns CLAM, skims the 5% redeem fee in CLAM to the FeeRouter, pays USDG 1:1 on the remainder.
- Fee constants live only in `GameConstants.sol` (doc-asserted against `docs/ECONOMY.md`); no admin setter, no upgrade path.
- Redemption has NO pause path anywhere in the bytecode. Minting has no pause either in the prototype; if a guardian mint-pause is wanted for launch, it must be a separate, clearly named function that provably cannot touch redeem or reserve (user to confirm; default: no pause at all).
- No function may move reserve except `redeem`; the reserve is never deployed into yield. `reserveSurplus()` stays as the on-chain proof of reserve (must always read 0).
- All rounding favors the protocol (fees ceil).
- FeeRouter: immutable split, anyone may `flush()`. All fees route 100% to the PrizePool (user decision 2026-08-16; already applied to `docs/ECONOMY.md`, `GameConstants.sol`, the sim and tests). Treasury and ops addresses are deploy-time env parameters pointing at the operator's hardware-wallet EOA (see `docs/adr/0002`, `.scratch/launch-readiness/issues/03`).
- Proof-of-reserve page in `apps/web`: live vault USDG balance vs CLAM supply from testnet, plus the fee schedule.

Includes: unit + fuzz + the Foundry invariant campaign (reserve == supply under arbitrary sequences), an ABI-wide test that no selector can pause redeem or move reserve, and Blockscout verification.

## Acceptance criteria

- [ ] Mint and redeem work on testnet 46630 with a real wallet (real USDG on mainnet; MockUSDG on testnet since none exists there)
- [ ] Invariant suite passes: vault USDG balance == CLAM totalSupply after arbitrary sequences (the prototype's `invariant_vaultReserveEqualsSupply` carried forward)
- [ ] No code path can pause redemption or withdraw reserve, asserted by a test over the full ABI
- [ ] Fee math exact at boundaries (1-unit deposits, tiny redemptions) with protocol-favoring rounding; 2%/5% asserted against `docs/ECONOMY.md`
- [ ] Proof-of-reserve page shows live numbers from testnet
- [ ] Contracts verified on Blockscout (`--verifier blockscout --verifier-url https://explorer.testnet.chain.robinhood.com/api/`)
- [ ] `packages/proto` Anvil replay still matches the simulator after the change

## Open questions for the operator

- CLAM decimals: the prototype uses 6 (matching USDG, no scaling seam); older docs said 18. Confirm 6, or say 18 and this ticket adds the scaling.
- Guardian mint-pause: the prototype vault has no pause of any kind. Confirm none, or ask for a mint-only pause (redeem stays unpausable regardless).
- Treasury address for the FeeRouter and ops split on testnet: the deployer wallet, or a multisig you will provide?
