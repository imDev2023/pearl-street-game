// "Income game" scenarios: the same sellout world (no growth after launch, the harshest
// case) with post-launch features layered in one at a time, so each lever's effect on
// pool refill, player payback, and protocol revenue is isolated. Then all together, and
// all together with a leaderboard-heavy split. Constants here are proposals to be
// decided by the user (docs/BURN-CAP-DESIGN.md), not documented economy constants.

import type {BurnCapConfig, JoinRequest, LootingConfig, MarketplaceConfig, ScenarioConfig} from "./engine.js";
import type {Regime} from "./market.js";
import type {Rng} from "./rng.js";

/** Sellout at launch: mostly casual, some skilled, a few bots (as in the base suite). */
function selloutJoins(rng: Rng): JoinRequest[] {
  const joins: JoinRequest[] = [];
  for (let i = 0; i < 1_700; i++) {
    const roll = rng();
    if (roll < 0.7) joins.push({archetype: "casual", creaturesWanted: 3});
    else if (roll < 0.93) joins.push({archetype: "skilled", creaturesWanted: 6});
    else joins.push({archetype: "bot", creaturesWanted: 15});
  }
  return joins;
}

const calmMarket = (day: number): Regime => (day % 10 < 7 ? "flat" : "bull");

export const LOOTING: LootingConfig = {contestedFraction: 0.3, rakeBps: 1_000n};

export const MARKETPLACE: MarketplaceConfig = {
  dailyTradeChance: {casual: 0.01, skilled: 0.04, bot: 0.06, whale: 0.06},
  priceFraction: 0.9,
  feeBps: 700n,
};

export const BURN_CAP: BurnCapConfig = {
  capMultiple: 4,
  relicBoostBps: 500, // +5% haul weight per relic
  maxRelicBoostBps: 3_000, // capped at +30%
  voucherDiscountBps: 2_000n, // 20% off the re-buy
  rebuyPropensity: {casual: 0.3, skilled: 0.7, bot: 0.95, whale: 0.95},
};

function base(name: string, seed: number, extra: Partial<ScenarioConfig>): ScenarioConfig {
  return {
    name,
    seed,
    days: 365,
    regimeForDay: calmMarket,
    joins: (day, _state, rng) => (day === 0 ? selloutJoins(rng) : []),
    leaveFraction: () => 0,
    ...extra,
  };
}

export const incomeBaseline = base("income-baseline", 8001, {});
export const incomeLooting = base("income-looting", 8002, {looting: LOOTING});
export const incomeMarketplace = base("income-marketplace", 8003, {marketplace: MARKETPLACE});
export const incomeBurnCap = base("income-burncap", 8004, {burnCap: BURN_CAP});
export const incomeAll = base("income-all", 8005, {looting: LOOTING, marketplace: MARKETPLACE, burnCap: BURN_CAP});
export const incomeAllPrizeHeavy = base("income-all-prizeheavy", 8006, {
  looting: LOOTING,
  marketplace: MARKETPLACE,
  burnCap: BURN_CAP,
  haulsSplitBps: 5_000n, // 50/50 hauls / leaderboard instead of 80/20
});

export const INCOME_SCENARIOS: ScenarioConfig[] = [
  incomeBaseline,
  incomeLooting,
  incomeMarketplace,
  incomeBurnCap,
  incomeAll,
  incomeAllPrizeHeavy,
];
