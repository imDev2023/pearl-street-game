// Regenerates the tables for docs/ECONOMY-STRESS-REPORT.md from the deterministic
// scenario runs. Usage: npm run report (from packages/sim).

import {ALL_SCENARIOS, CLAM, runScenario} from "../dist/index.js";

const fmt = (micro, dp = 0) => {
  const v = Number(micro) / Number(CLAM);
  return v.toLocaleString("en-US", {minimumFractionDigits: dp, maximumFractionDigits: dp});
};

for (const scenario of ALL_SCENARIOS) {
  const {state, metrics, fingerprint} = runScenario(scenario);
  console.log(`\n### Scenario: ${scenario.name} (seed ${scenario.seed}, ${scenario.days} days, fingerprint ${fingerprint})\n`);
  console.log("| Day | Regime | Pool (CLAM) | Release | Hauls paid | Players | Creatures | Yield/creature | Fees to pool |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  const sample = [0, 7, 14, 30, 45, 60, 90, 120, 180, 270, 364].filter((d) => d < scenario.days);
  if (!sample.includes(scenario.days - 1)) sample.push(scenario.days - 1);
  for (const d of sample) {
    const m = metrics.find((x) => x.day === d);
    console.log(
      `| ${m.day} | ${m.regime} | ${fmt(m.poolStart)} | ${fmt(m.release)} | ${fmt(m.haulsDistributed)} | ` +
        `${m.activePlayers} | ${m.activeCreatures} | ${fmt(m.perCreatureYield, 4)} | ${fmt(m.feeToPool, 2)} |`,
    );
  }
  const last = metrics[metrics.length - 1];
  const first = metrics[0];
  const perCreatureEarned =
    last.cohort0Creatures > 0 ? last.cohort0Earned / BigInt(last.cohort0Creatures) : 0n;
  const perCreatureSpent =
    last.cohort0Creatures > 0 ? last.cohort0Spent / BigInt(last.cohort0Creatures) : 0n;
  const paybackDay = metrics.find((m) => m.cohort0Spent > 0n && m.cohort0Earned >= m.cohort0Spent);
  const halfYieldDay = metrics.find(
    (m) => m.day > 0 && first.perCreatureYield > 0n && m.perCreatureYield * 2n <= first.perCreatureYield,
  );
  console.log(`\n- Final pool: ${fmt(state.pool)} CLAM; leaderboard pot: ${fmt(state.leaderboardPot)} CLAM.`);
  console.log(`- Treasury: ops ${fmt(state.treasuryOps)} CLAM, fee share ${fmt(state.treasuryFees)} CLAM.`);
  console.log(`- Cumulative: pool inflow ${fmt(state.cumPoolInflow)}, gameplay paid ${fmt(state.cumGameplayPaid)}, fee-to-pool ${fmt(state.cumFeeToPool)}, redeemed ${fmt(state.cumRedeemedUsdg)} USDG.`);
  console.log(`- Gen-0 minted: ${state.gen0Minted}; Gen-1 bred: ${state.gen1Total}; idle creatures: ${state.idleCreatures}.`);
  console.log(`- Day-0 cohort per creature: earned ${fmt(perCreatureEarned, 2)} vs spent ${fmt(perCreatureSpent, 2)} CLAM; payback day: ${paybackDay ? paybackDay.day : "never within horizon"}.`);
  console.log(`- Day yield first halves: ${halfYieldDay ? `day ${halfYieldDay.day}` : "never within horizon"}.`);
  if (scenario.name === "whale-bots") {
    const worst = metrics.reduce((w, m) => Math.max(w, m.whalePayoutShare - m.whaleWeightShare), 0);
    const peak = metrics.reduce((w, m) => Math.max(w, m.whalePayoutShare), 0);
    console.log(`- Peak whale payout share: ${(peak * 100).toFixed(1)}%; max excess over weighted share: ${(worst * 100).toFixed(4)}%.`);
  }
}
