# CLAM has 6 decimals, matching USDG

Status: accepted (2026-08-16)

CLAM is a 1:1 wrapper over USDG, which has 6 decimals; older docs assumed the ERC-20 default of 18.
We decided CLAM uses 6 decimals so that vault accounting, the reserve == supply invariant, and every fee computation are unit-for-unit with the reserve token, with no scaling seam anywhere in the code.
The cost is that CLAM looks unusual next to 18-decimal tokens in wallets and DEX UIs; the benefit is that a whole class of rounding and conversion bugs cannot exist.
The token is non-upgradeable, so this cannot change after the vault is deployed.
