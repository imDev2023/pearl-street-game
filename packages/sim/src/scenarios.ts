// The T-018 stress-scenario suite. Each scenario is a full ScenarioConfig; the
// invariants in engine.ts are asserted after every simulated day of every scenario.

import type {JoinRequest, ScenarioConfig, State} from "./engine.js";
import type {Regime} from "./market.js";
import type {Rng} from "./rng.js";

/** A typical join mix: mostly casual players, some skilled, a few bots. */
function mixedJoins(count: number, rng: Rng): JoinRequest[] {
  const joins: JoinRequest[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rng();
    if (roll < 0.7) joins.push({archetype: "casual", creaturesWanted: 3});
    else if (roll < 0.93) joins.push({archetype: "skilled", creaturesWanted: 6});
    else joins.push({archetype: "bot", creaturesWanted: 15});
  }
  return joins;
}

const calmMarket = (day: number): Regime => (day % 10 < 7 ? "flat" : "bull");

/** Healthy launch: sellout over two weeks, modest growth, then stagnation. */
export const baseline: ScenarioConfig = {
  name: "baseline",
  seed: 1001,
  days: 270,
  regimeForDay: calmMarket,
  joins: (day, state, rng) => {
    if (day < 14) return mixedJoins(120, rng);
    if (day < 90) return mixedJoins(8, rng);
    return mixedJoins(2, rng);
  },
  leaveFraction: (day) => (day > 30 ? 0.002 : 0),
  breedingEnabled: true,
};

/** The Crabada death-spiral replay: hype growth, then inflows collapse to zero. */
export const deathSpiral: ScenarioConfig = {
  name: "death-spiral",
  seed: 2002,
  days: 270,
  regimeForDay: (day) => (day < 60 ? "bull" : day < 90 ? "crash" : "flat"),
  joins: (day, _state, rng) => {
    if (day < 30) return mixedJoins(200, rng);
    if (day < 60) return mixedJoins(20, rng);
    return []; // reward-driven inflows collapse entirely
  },
  leaveFraction: (day) => (day >= 60 && day < 120 ? 0.02 : day >= 120 ? 0.005 : 0),
};

/** Mass exit: baseline until day 45, then 70% of players redeem everything at once. */
export const massExit: ScenarioConfig = {
  name: "mass-exit",
  seed: 3003,
  days: 120,
  regimeForDay: calmMarket,
  joins: (day, _state, rng) => (day < 14 ? mixedJoins(120, rng) : day < 45 ? mixedJoins(10, rng) : []),
  leaveFraction: (day) => (day === 45 ? 0.7 : 0),
};

/** Whale and bot pressure: five sybil whale fleets plus bots against a small honest base. */
export const whaleBots: ScenarioConfig = {
  name: "whale-bots",
  seed: 4004,
  days: 180,
  regimeForDay: calmMarket,
  sybilWhales: true,
  joins: (day, _state, rng) => {
    if (day === 0) {
      const whales: JoinRequest[] = Array.from({length: 5}, () => ({
        archetype: "whale" as const,
        creaturesWanted: 600,
      }));
      return [...whales, ...mixedJoins(150, rng)];
    }
    if (day < 14) return mixedJoins(80, rng);
    return [];
  },
  leaveFraction: () => 0,
};

/** No-growth world: sellout at launch, then zero new players, ever, for a full year. */
export const noGrowth: ScenarioConfig = {
  name: "no-growth",
  seed: 5005,
  days: 365,
  regimeForDay: calmMarket,
  joins: (day, _state, rng) => (day === 0 ? mixedJoins(1_700, rng) : []),
  leaveFraction: () => 0,
  breedingEnabled: true,
};

/** Boom-bust market: feed regimes swing the modifier through its whole 0.7x-1.3x range. */
export const boomBust: ScenarioConfig = {
  name: "boom-bust",
  seed: 6006,
  days: 180,
  regimeForDay: (day) => {
    const cycle = day % 40;
    if (cycle < 10) return "flat";
    if (cycle < 20) return "bull";
    if (cycle < 30) return "crash";
    return "whipsaw";
  },
  joins: (day, _state, rng) => (day < 14 ? mixedJoins(120, rng) : []),
  leaveFraction: () => 0,
  staleChance: 0.05,
};

export const ALL_SCENARIOS: ScenarioConfig[] = [
  baseline,
  deathSpiral,
  massExit,
  whaleBots,
  noGrowth,
  boomBust,
];
