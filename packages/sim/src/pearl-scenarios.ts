// PEARL-as-income scenarios: the "all features on" income world with PEARL play rewards
// layered on top, at six market caps. PEARL emission follows docs/TOKENOMICS.md
// (min(schedule, 25% of trailing-7-day revenue), 1B hard cap); the market cap sets the
// price of each emitted token, never how many revenue can justify.
// ASSUMED (not documented, flagged in the report): 40% of the hard cap is the play-rewards
// allocation, emitted linearly over 4 years; Founder's Wake +20%.

import type {PearlConfig, ScenarioConfig} from "./engine.js";
import {BURN_CAP, incomeAll, LOOTING, MARKETPLACE} from "./income-scenarios.js";

export const PEARL_BASE: Omit<PearlConfig, "marketCapUsd"> = {
  hardCap: 1_000_000_000,
  rewardsAllocationFraction: 0.4,
  scheduleDays: 4 * 365,
  revenueThrottle: 0.25,
  foundersWakeBps: 2_000,
  sellFraction: {casual: 0.2, skilled: 0.5, bot: 0.95, whale: 0.9},
};

export const PEARL_MARKET_CAPS_USD = [1e6, 5e6, 10e6, 50e6, 100e6, 200e6];

export const PEARL_SCENARIOS: ScenarioConfig[] = PEARL_MARKET_CAPS_USD.map((cap, i) => ({
  ...incomeAll,
  name: `pearl-${cap / 1e6}m`,
  seed: 9001 + i,
  looting: LOOTING,
  marketplace: MARKETPLACE,
  burnCap: BURN_CAP,
  pearl: {...PEARL_BASE, marketCapUsd: cap},
}));

/**
 * The user's recurring revenue source (2026-08-15): protocol-owned PEARL liquidity earning
 * swap fees. ASSUMED: daily volume 2% of market cap, 1% fee tier (Uniswap V3 style),
 * protocol owns 60% of the pool (75% of launch proceeds go to LP per TOKENOMICS.md).
 */
export const PEARL_TRADING = {dailyVolumeFraction: 0.02, lpFeeBps: 100, protocolPoolShare: 0.6};

export const PEARL_TRADING_SCENARIOS: ScenarioConfig[] = PEARL_SCENARIOS.map((sc, i) => ({
  ...sc,
  name: `${sc.name}-trading`,
  seed: 9101 + i,
  pearl: {...sc.pearl!, trading: PEARL_TRADING},
}));
