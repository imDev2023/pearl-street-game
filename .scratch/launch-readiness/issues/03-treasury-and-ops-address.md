# Treasury and ops address
Type: grilling
Status: resolved
Blocked by: -

## Question
FeeRouter treasury and Gen-0 ops split need an address at deploy time. Deployer EOA, or a Safe multisig, and how many signers?

## Answer
A single hardware-wallet EOA owned by the operator (public address supplied at deploy time), not a multisig.
Keep it flexible until launch: deploy scripts read TREASURY and OPS from env, so the address can change any time before mainnet deployment and is immutable after.
Testnet uses the deployer wallet. Forge deploy scripts must support the hardware wallet (`--ledger` or `--trezor`, operator to say which).
Addendum 2026-08-16: the hardware wallet is a Trezor; forge scripts use `--trezor` (and `--sender`), never a PRIVATE_KEY env for mainnet.
