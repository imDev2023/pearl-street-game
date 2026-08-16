# T-008: Testnet playtest and security review

Status: ready
Blocked by: T-005, T-006, T-007, T-012a, T-016 (pre-sale + claim contracts must be in the audit scope)

## What to build

The launch gate: a closed playtest on testnet 46630 and a security pass before real money touches the contracts.

Run a structured playtest (community or internal) through the full loop: onboard, wrap, mint, voyage, claim, redeem.
Tune economic constants (mint price, prize split, multiplier bounds, energy budget) from observed data and record the final values.
Security review of the ClamVault, PearlCreatures (royalty + allowlist), and the PEARL pre-sale/vesting/emission contracts by an external auditor; internal review checklist for the rest using the evm-security and solidity-security standards.
Write the public risk disclosure: wrapper mechanics, feed dependence, sequencer screening, 7-day L1 withdrawal, Security Council control of the chain.

## Acceptance criteria

- [ ] Playtest completed with at least the full loop exercised by external hands
- [ ] Economic constants finalized and documented with rationale
- [ ] External audit of ClamVault complete with findings resolved
- [ ] Risk disclosure page written and reviewed
- [ ] Legal review obtained for the CLAM wrapper framing, the PEARL pre-sale, and the Founder allocation (claim-through-play, no airdrop)

## Decisions from the launch-readiness map (2026-08-16)

- Gate is internal review (evm-security, solidity-security, Slither in CI) + invariant campaign + bug bounty; external audit optional, not a dependency; no legal gate, risk disclosure mandatory (`issues/04`, `issues/05`).
