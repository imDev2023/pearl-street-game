// The T-018 stress suite: every scenario runs its full horizon here, in CI, and the
// engine asserts every economic invariant after every simulated day. A scenario that
// merely completes has already proven: pool never negative, release never above the
// 1.5% cap, vault reserve == CLAM supply, CLAM conservation, and gameplay payouts
// never exceeding prior pool inflows.

import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_SCENARIOS,
  baseline,
  boomBust,
  BPS,
  DAILY_RELEASE_BPS,
  deathSpiral,
  massExit,
  noGrowth,
  runScenario,
  whaleBots,
} from "../dist/index.js";

const results = new Map();
for (const scenario of ALL_SCENARIOS) {
  results.set(scenario.name, runScenario(scenario));
}

test("every scenario completes with all engine invariants green", () => {
  for (const scenario of ALL_SCENARIOS) {
    const {metrics} = results.get(scenario.name);
    assert.equal(metrics.length, scenario.days, `${scenario.name} ran its full horizon`);
  }
});

test("runs are deterministic from their seed", () => {
  const again = runScenario(baseline);
  assert.equal(again.fingerprint, results.get(baseline.name).fingerprint);
  const reseeded = runScenario({...baseline, seed: baseline.seed + 1});
  assert.notEqual(reseeded.fingerprint, results.get(baseline.name).fingerprint);
});

test("the pool only ever pays the daily release; it can never be drained faster", () => {
  for (const scenario of ALL_SCENARIOS) {
    for (const m of results.get(scenario.name).metrics) {
      assert.ok(m.poolEnd >= m.poolStart - m.release, `${scenario.name} day ${m.day}`);
      assert.ok(m.release <= (m.poolStart * DAILY_RELEASE_BPS) / BPS, `${scenario.name} day ${m.day}`);
    }
  }
});

test("death spiral: yields shrink smoothly, the pool never breaks", () => {
  const {metrics, state} = results.get(deathSpiral.name);
  assert.ok(state.pool > 0n, "pool still positive after the collapse");
  for (const m of metrics) {
    if (m.activeCreatures > 0 && m.release > 1_000_000n) {
      assert.ok(m.haulsDistributed > 0n, `day ${m.day}: hauls still paying while the pool holds value`);
    }
  }
  const last = metrics[metrics.length - 1];
  assert.ok(last.perCreatureYield > 0n, "survivors still earn a (smaller) share at the end");
});

test("mass exit: the vault pays every redeemer in full and stays solvent by construction", () => {
  const {metrics, state} = results.get(massExit.name);
  const exitDay = metrics.find((m) => m.day === 45);
  assert.ok(exitDay.redeemedUsdg > 0n, "the exit actually redeemed");
  assert.equal(state.vaultReserve, state.clamSupply, "reserve == supply after the run");
  const after = metrics.find((m) => m.day === 46);
  assert.ok(after.activePlayers > 0 && after.haulsDistributed > 0n, "the game continues for stayers");
});

test("whales and bots cannot extract more than their modifier-weighted share", () => {
  const {metrics} = results.get(whaleBots.name);
  for (const m of metrics) {
    assert.ok(
      m.whalePayoutShare <= m.whaleWeightShare + 0.001,
      `day ${m.day}: whale payout share ${m.whalePayoutShare} vs weight share ${m.whaleWeightShare}`,
    );
  }
});

test("no-growth world: yields decay geometrically but never hit a broken promise", () => {
  const {metrics, state} = results.get(noGrowth.name);
  const day180 = metrics.find((m) => m.day === 180);
  assert.ok(day180.perCreatureYield > 0n, "per-creature yield still above zero at day 180");
  const day364 = metrics.find((m) => m.day === 364);
  assert.ok(day364.perCreatureYield > 0n, "per-creature yield still above zero at day 364");
  assert.ok(state.pool > 0n, "pool positive after a full year of zero growth");
});

test("boom-bust: the market modifier changes distribution, never total emission", () => {
  const {metrics} = results.get(boomBust.name);
  for (const m of metrics) {
    assert.equal(
      m.release,
      (m.poolStart * DAILY_RELEASE_BPS) / BPS,
      `day ${m.day} (${m.regime}): release is exactly the cap, independent of regime`,
    );
    if (m.voyages > 0) {
      const tranche = (m.release * 8_000n) / BPS;
      const dust = tranche - m.haulsDistributed;
      assert.ok(dust >= 0n && dust <= BigInt(Math.max(1, m.activePlayers)), `day ${m.day} dust bounded`);
    }
  }
});

test("doubloons stay soulbound: they never become CLAM", () => {
  // Structural: the engine only credits CLAM from vault-mint, haul, leaderboard, or
  // secondary-sale. Here we confirm gameplay CLAM never exceeded pool inflows even
  // though billions of Doubloons were earned across scenarios.
  for (const scenario of ALL_SCENARIOS) {
    const {state} = results.get(scenario.name);
    const totalDoubloons = state.players.reduce((s, p) => s + p.doubloons, 0);
    assert.ok(totalDoubloons > 0, `${scenario.name} earned doubloons`);
    assert.ok(state.cumGameplayPaid <= state.cumPoolInflow, `${scenario.name} conservation`);
  }
});

test("income scenarios (looting, marketplace, burn cap) keep every invariant and stay deterministic", async () => {
  const {INCOME_SCENARIOS, incomeAll} = await import("../dist/index.js");
  for (const scenario of INCOME_SCENARIOS) {
    const {metrics, state} = runScenario(scenario);
    assert.equal(metrics.length, scenario.days, `${scenario.name} ran its full horizon`);
    assert.ok(state.cumGameplayPaid <= state.cumPoolInflow, `${scenario.name} conservation`);
    assert.equal(state.vaultReserve, state.clamSupply, `${scenario.name} vault invariant`);
  }
  assert.equal(runScenario(incomeAll).fingerprint, runScenario(incomeAll).fingerprint);
});

test("PEARL scenarios: emission is revenue-throttled and market cap never changes CLAM-side invariants", async () => {
  const {PEARL_SCENARIOS, PEARL_TRADING_SCENARIOS} = await import("../dist/index.js");
  for (const scenario of [...PEARL_SCENARIOS, ...PEARL_TRADING_SCENARIOS]) {
    const {metrics, state} = runScenario(scenario);
    assert.equal(metrics.length, scenario.days, `${scenario.name} ran its full horizon`);
    assert.equal(state.vaultReserve, state.clamSupply, `${scenario.name} vault invariant`);
    assert.ok(state.cumGameplayPaid <= state.cumPoolInflow, `${scenario.name} conservation`);
    // Throttle: no day may emit more PEARL (in USD) than 25% of the trailing week's revenue.
    let window = [];
    for (const m of metrics) {
      window.push(Number(m.revenueToday) / 1e6);
      if (window.length > 7) window.shift();
      const trailing = window.reduce((s, v) => s + v, 0);
      const emittedUsd = m.pearlEmitted * m.pearlPriceUsd;
      assert.ok(emittedUsd <= 0.25 * trailing / 7 + 1e-6, `${scenario.name} day ${m.day}: PEARL emission exceeded the revenue throttle`);
    }
  }
});
