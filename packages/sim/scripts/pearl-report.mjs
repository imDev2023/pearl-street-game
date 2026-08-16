// PEARL-as-income tables across market caps: emission, USD value distributed, and
// per-archetype total earnings (CLAM + PEARL) vs entry, plus per-player daily USD.
// Usage: npm run build && node scripts/pearl-report.mjs   (from packages/sim)

import {CLAM, PEARL_SCENARIOS, PEARL_TRADING_SCENARIOS, runScenario} from "../dist/index.js";

const SET = process.argv.includes("--trading") ? PEARL_TRADING_SCENARIOS : PEARL_SCENARIOS;
const TITLE = process.argv.includes("--trading") ? "WITH protocol-owned LP trading fees (2% of cap daily volume, 1% tier, 60% pool share)" : "game revenue only (no PEARL trading fees)";

const usd = (v, dp = 0) => "$" + Number(v).toLocaleString("en-US", {minimumFractionDigits: dp, maximumFractionDigits: dp});
const clamUsd = (micro) => Number(micro) / Number(CLAM); // CLAM is 1:1 USD
const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) + "%" : "-");

console.log(`## PEARL play rewards by market cap - ${TITLE}\n`);
console.log("All features on, sellout, zero growth, 365 days.\n");
console.log("Emission = min(schedule, 25% x trailing-7-day revenue / price). Revenue is the binding constraint at every cap.\n");
console.log("| Market cap | PEARL price | PEARL emitted (yr) | % of rewards schedule | USD value distributed | Avg USD/creature/day (PEARL) | Avg USD/creature/day (CLAM hauls) | Protocol revenue (yr) | of which trading fees |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
const results = [];
for (const sc of SET) {
  const r = runScenario(sc);
  results.push([sc, r]);
  const price = sc.pearl.marketCapUsd / sc.pearl.hardCap;
  const emitted = r.state.cumPearlEmitted;
  const scheduleYear = (sc.pearl.hardCap * sc.pearl.rewardsAllocationFraction) / sc.pearl.scheduleDays * 365;
  const usdDistributed = emitted * price;
  const creatureDays = r.metrics.reduce((s, m) => s + m.activeCreatures, 0);
  const clamHauls = clamUsd(r.metrics.reduce((s, m) => s + m.haulsDistributed, 0n));
  console.log(
    `| ${usd(sc.pearl.marketCapUsd)} | ${usd(price, 4)} | ${Math.round(emitted).toLocaleString()} | ${pct(emitted, scheduleYear)} | ${usd(usdDistributed)} | ${usd(usdDistributed / creatureDays, 4)} | ${usd(clamHauls / creatureDays, 4)} | ${usd(clamUsd(r.state.cumRevenue))} | ${usd(clamUsd(r.state.cumTradingRevenue))} |`,
  );
}

console.log("\n### Total earnings (CLAM hauls + loot + leaderboard + PEARL at emission price) vs entry, per archetype\n");
console.log("| Market cap | Casual recovered | Skilled recovered | Bot recovered | Top 10% recovered | Players fully paid back | Best player earned / spent |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
for (const [sc, r] of results) {
  const cohort = r.state.players.filter((p) => p.joinedDay === 0);
  const total = (p) => clamUsd(p.cumEarnedClam) + p.pearlEarnedUsd;
  const rec = (arch) => {
    const ps = cohort.filter((p) => p.archetype === arch);
    return pct(ps.reduce((s, p) => s + total(p), 0), ps.reduce((s, p) => s + clamUsd(p.cumSpentClam), 0));
  };
  const sorted = [...cohort].sort((a, b) => total(b) - total(a));
  const top = sorted.slice(0, Math.ceil(sorted.length * 0.1));
  const topRec = pct(top.reduce((s, p) => s + total(p), 0), top.reduce((s, p) => s + clamUsd(p.cumSpentClam), 0));
  const paidBack = cohort.filter((p) => total(p) >= clamUsd(p.cumSpentClam)).length;
  const best = sorted[0];
  console.log(
    `| ${usd(sc.pearl.marketCapUsd)} | ${rec("casual")} | ${rec("skilled")} | ${rec("bot")} | ${topRec} | ${paidBack} of ${cohort.length} | ${usd(total(best))} / ${usd(clamUsd(best.cumSpentClam))} (${best.archetype}) |`,
  );
}

console.log("\n### Daily USD income per player by archetype (median player, PEARL + CLAM, averaged over the year)\n");
console.log("| Market cap | Casual (3 creatures) | Skilled (6) | Bot (15) | of which PEARL share |");
console.log("| --- | --- | --- | --- | --- |");
for (const [sc, r] of results) {
  const cohort = r.state.players.filter((p) => p.joinedDay === 0);
  const med = (arch) => {
    const vals = cohort.filter((p) => p.archetype === arch).map((p) => (clamUsd(p.cumEarnedClam) + p.pearlEarnedUsd) / sc.days).sort((a, b) => a - b);
    return vals[Math.floor(vals.length / 2)] ?? 0;
  };
  const allEarn = cohort.reduce((s, p) => s + clamUsd(p.cumEarnedClam) + p.pearlEarnedUsd, 0);
  const pearlEarn = cohort.reduce((s, p) => s + p.pearlEarnedUsd, 0);
  console.log(`| ${usd(sc.pearl.marketCapUsd)} | ${usd(med("casual"), 3)} | ${usd(med("skilled"), 3)} | ${usd(med("bot"), 3)} | ${pct(pearlEarn, allEarn)} |`);
}

// The counterfactual everyone assumes: what if emissions were NOT revenue-throttled?
console.log("\n### Counterfactual: schedule-only emission (throttle removed) - the TUS pattern\n");
console.log("| Market cap | PEARL emitted (yr) | USD distributed | Bot recovered | Sell pressure vs market cap |");
console.log("| --- | --- | --- | --- | --- |");
for (const sc of SET) {
  const r = runScenario({...sc, name: sc.name + "-unthrottled", pearl: {...sc.pearl, revenueThrottle: 1e9}});
  const price = sc.pearl.marketCapUsd / sc.pearl.hardCap;
  const emitted = r.state.cumPearlEmitted;
  const cohort = r.state.players.filter((p) => p.joinedDay === 0);
  const bots = cohort.filter((p) => p.archetype === "bot");
  const rec = pct(bots.reduce((s, p) => s + clamUsd(p.cumEarnedClam) + p.pearlEarnedUsd, 0), bots.reduce((s, p) => s + clamUsd(p.cumSpentClam), 0));
  const sold = cohort.reduce((s, p) => s + p.pearlEarnedUsd * sc.pearl.sellFraction[p.archetype], 0);
  console.log(`| ${usd(sc.pearl.marketCapUsd)} | ${Math.round(emitted).toLocaleString()} | ${usd(emitted * price)} | ${rec} | ${pct(sold, sc.pearl.marketCapUsd)} of cap sold in year 1 |`);
}
