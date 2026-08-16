// Synthetic feed-price regimes and the voyage market modifier.
// The modifier is the signed feed delta over the 8h voyage, amplified, then hard-capped
// to 0.7x-1.3x (docs/ECONOMY.md). A stale or missing feed voids the modifier and pays
// the base haul, so settlement never bricks.

import {
  MODIFIER_AMPLIFICATION,
  MODIFIER_MAX_BPS,
  MODIFIER_MIN_BPS,
} from "./constants.js";
import {gaussian, type Rng} from "./rng.js";

export type Regime = "flat" | "bull" | "crash" | "whipsaw";

export interface MarketDay {
  regime: Regime;
  /** Per-ticker 8h returns for the day (fraction, e.g. -0.03). */
  tickerReturns: number[];
  /** Probability that a given voyage settles against a stale feed (modifier voided). */
  staleChance: number;
}

/** Number of feed-covered tickers (35 in packages/sdk feeds.ts; mirrored as a count here). */
export const TICKER_COUNT = 35;

const REGIME_PARAMS: Record<Regime, {drift: number; vol: number}> = {
  flat: {drift: 0, vol: 0.004},
  bull: {drift: 0.01, vol: 0.015},
  crash: {drift: -0.05, vol: 0.03},
  whipsaw: {drift: 0, vol: 0.05},
};

export function makeMarketDay(regime: Regime, day: number, rng: Rng, staleChance = 0.02): MarketDay {
  const {drift, vol} = REGIME_PARAMS[regime];
  const tickerReturns: number[] = [];
  for (let i = 0; i < TICKER_COUNT; i++) {
    let r = drift + vol * gaussian(rng);
    // Whipsaw alternates sign day over day on top of high volatility.
    if (regime === "whipsaw") r += day % 2 === 0 ? 0.04 : -0.04;
    tickerReturns.push(r);
  }
  return {regime, tickerReturns, staleChance};
}

/**
 * Modifier for one voyage in bps of the base haul, or null when the feed is stale
 * (the settlement then pays the base haul, i.e. an effective 10,000 bps).
 */
export function voyageModifierBps(market: MarketDay, tickerIndex: number, rng: Rng): bigint | null {
  if (rng() < market.staleChance) return null;
  const delta = market.tickerReturns[tickerIndex] * MODIFIER_AMPLIFICATION;
  const raw = BigInt(Math.round(10_000 * (1 + delta)));
  if (raw < MODIFIER_MIN_BPS) return MODIFIER_MIN_BPS;
  if (raw > MODIFIER_MAX_BPS) return MODIFIER_MAX_BPS;
  return raw;
}
