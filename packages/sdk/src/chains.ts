// Chain constants for Robinhood Chain, verified against docs/reference/ROBINHOOD-CHAIN.md.
// Moving values (supplies, prices) must always be re-read on-chain; addresses and IDs
// below are stable infrastructure verified 2026-08-12.

export interface RobinhoodChain {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  /** Blockscout API base for contract verification (forge --verifier-url). */
  verifierUrl: string;
}

export const ROBINHOOD_MAINNET: RobinhoodChain = {
  chainId: 4663,
  name: "Robinhood Chain",
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  explorerUrl: "https://robinhoodchain.blockscout.com",
  verifierUrl: "https://robinhoodchain.blockscout.com/api/",
};

export const ROBINHOOD_TESTNET: RobinhoodChain = {
  chainId: 46630,
  name: "Robinhood Chain Testnet",
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  explorerUrl: "https://explorer.testnet.chain.robinhood.com",
  verifierUrl: "https://explorer.testnet.chain.robinhood.com/api/",
};

/** USDG on mainnet 4663: the game's reserve asset. 6 decimals, unlike most stables' 18. */
export const USDG_ADDRESS = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
export const USDG_DECIMALS = 6;

/** WETH on mainnet 4663. */
export const WETH_ADDRESS = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as const;

/** ArbSys precompile: use ArbSys.arbBlockNumber() or timestamps, never block.number. */
export const ARBSYS_ADDRESS = "0x0000000000000000000000000000000000000064" as const;

/** Canonical Multicall3, deployed on mainnet 4663 (undocumented but verified working). */
export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;
