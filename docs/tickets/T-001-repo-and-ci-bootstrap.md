# T-001: Repo and CI bootstrap

Status: done in-repo 2026-08-15; CI run and testnet deploy pending the first push to a GitHub remote
Blocked by: None - can start immediately

## What to build

A working monorepo where a fresh clone can build and test everything with documented commands.
Foundry project initialized in `contracts/` configured for Robinhood testnet (46630) and mainnet (4663), with the Blockscout verifier URLs.
Placeholder workspaces for `apps/web`, `apps/indexer`, and `packages/sdk` with a root README explaining the layout.
CI (GitHub Actions) runs `forge build`, `forge test`, and lint on every push.
`packages/sdk` starts with the chain constants: chain IDs, RPC URLs, USDG address, and the 35-ticker Chainlink feed registry extracted from the reference docs.

## Acceptance criteria

- [x] `forge test` passes on a fresh clone with documented setup steps (README Getting started)
- [ ] CI is green on the main branch (workflow written at .github/workflows/ci.yml; no GitHub remote or commits exist yet - user action)
- [x] SDK exports chain constants and the feed registry with addresses verified against `docs/reference/ROBINHOOD-CHAIN.md` (generated from the captured Chainlink table; 4 registry tests)
- [x] Deploy scripts exist for testnet with Blockscout verification wired (script/DeployHarborBell.s.sol; live deploy needs a funded PRIVATE_KEY - user action)
