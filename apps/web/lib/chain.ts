import {defineChain} from "viem";
import {ROBINHOOD_MAINNET, ROBINHOOD_TESTNET} from "@pearlstreet/sdk";

/** viem chain definitions for Robinhood Chain (Arbitrum Nitro, ETH gas). */
export const robinhoodTestnet = defineChain({
  id: ROBINHOOD_TESTNET.chainId,
  name: ROBINHOOD_TESTNET.name,
  nativeCurrency: {name: "Ether", symbol: "ETH", decimals: 18},
  rpcUrls: {default: {http: [ROBINHOOD_TESTNET.rpcUrl]}},
  blockExplorers: {default: {name: "Blockscout", url: ROBINHOOD_TESTNET.explorerUrl}},
  testnet: true,
});

export const robinhoodMainnet = defineChain({
  id: ROBINHOOD_MAINNET.chainId,
  name: ROBINHOOD_MAINNET.name,
  nativeCurrency: {name: "Ether", symbol: "ETH", decimals: 18},
  rpcUrls: {default: {http: [ROBINHOOD_MAINNET.rpcUrl]}},
  blockExplorers: {default: {name: "Blockscout", url: ROBINHOOD_MAINNET.explorerUrl}},
});

/** The chain this build talks to. Testnet until T-009 flips it. */
export const ACTIVE_CHAIN = robinhoodTestnet;
