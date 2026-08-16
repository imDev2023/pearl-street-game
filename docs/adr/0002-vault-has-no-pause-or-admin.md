# The CLAM vault has no pause, no owner, and no admin surface of any kind

Status: accepted (2026-08-16)

A guardian mint-pause was considered for launch (redeem was always going to stay unpausable).
We decided the vault ships with no pause path at all, no owner, and no function other than `redeem` that can move reserve; the fee constants are compile-time and there is no upgrade path.
The trade-off is that an incident cannot be stopped at the vault; in exchange the run-proof claim ("redemption never pausable, reserve never withdrawable, reserve never deployed into yield") is provable from bytecode with an ABI-wide test, which is the whole story of CLAM.
Incident response happens outside the vault: pausing the game or the sale, and public disclosure.
Treasury and ops addresses are deploy-time constructor parameters (a single hardware-wallet EOA at launch, chosen by the operator), which keeps them changeable up to deployment and immutable afterwards.
