// Deployed Pearl Street contracts per chain. Testnet entries come from
// contracts/deployments/<chainId>.json (T-002, 2026-08-16); mainnet is filled at launch (T-009).
export interface ClamDeployment {
  chainId: number;
  usdg: `0x${string}`;
  clam: `0x${string}`;
  vault: `0x${string}`;
  feeRouter: `0x${string}`;
  /** Testnet only: MockUSDG has a public faucet(uint256) capped at 10,000,000 USDG per call. */
  usdgIsMock: boolean;
}

export const CLAM_DEPLOYMENTS: Record<number, ClamDeployment> = {
  46630: {
    chainId: 46630,
    usdg: "0xAcC33156895341655F56aB29AdbE0d39086763C1",
    clam: "0x322C3D2406B168060c9726183e5C6ccD3937cC84",
    vault: "0xAF8e9A558C70b6F66724F4fCEaef34310798B759",
    feeRouter: "0x57eAaE81d5D41B2c30bB69345B66fe5EeCD42B81",
    usdgIsMock: true,
  },
};

export function clamDeployment(chainId: number): ClamDeployment {
  const d = CLAM_DEPLOYMENTS[chainId];
  if (!d) throw new Error(`no CLAM deployment for chain ${chainId}`);
  return d;
}
