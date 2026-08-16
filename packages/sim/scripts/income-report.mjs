// Tables for the income-game scenarios: pool refill vs release, per-archetype
// payback and min/median/max earnings, retirements/re-buys, and protocol revenue.
// Usage: npm run build && node scripts/income-report.mjs   (from packages/sim)

import {CLAM, INCOME_SCENARIOS, runScenario} from "../dist/index.js";

const fmt = (micro, dp = 0) =>
  (Number(micro) / Number(CLAM)).toLocaleString("en-US", {minimumFractionDigits: dp, maximumFractionDigits: dp});
const pct = (a, b) => (Number(b) > 0 ? ((Number(a) / Number(b)) * 100).toFixed(1) + "%" : "-");

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

console.log("## Income-game scenarios (365 days, sellout, zero growth)\n");
console.log("| Scenario | Pool day 0 | Pool day 90 | Pool day 365 | Refill / release (yr) | Loot moved | Market volume | Retirements | Re-buys | Ops treasury |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
const results = [];
for (const sc of INCOME_SCENARIOS) {
  const r = runScenario(sc);
  results.push([sc, r]);
  const {state: s, metrics: m} = r;
  const released = m.reduce((acc, d) => acc + d.release, 0n);
  const refill = s.cumPoolInflow - m[0].poolStart; // everything after the sale seed
  console.log(
    `| ${sc.name} | ${fmt(m[0].poolStart)} | ${fmt(m[90].poolStart)} | ${fmt(m[364].poolEnd)} | ${pct(refill, released)} | ` +
      `${fmt(s.cumLootMoved)} | ${fmt(s.cumMarketVolume)} | ${s.cumRetirements} | ${s.cumRebuys} | ${fmt(s.treasuryOps + s.treasuryFees)} |`,
  );
}

for (const [sc, r] of results) {
  console.log(`\n### ${sc.name}: per-archetype, 365 days\n`);
  console.log("| Archetype | Players | Spent (CLAM) | Earned total | Recovered | Earned/creature min | median | max | Loot won | Loot lost | Retire | Re-buy |");
  console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  const groups = new Map();
  for (const p of r.state.players) {
    if (p.joinedDay !== 0) continue;
    const g = groups.get(p.archetype) ?? {n: 0, spent: 0n, earned: 0n, per: [], won: 0n, lost: 0n, ret: 0, rebuy: 0};
    g.n += 1;
    g.spent += p.cumSpentClam;
    g.earned += p.cumEarnedClam;
    const creaturesEver = p.creatures + p.retirements - p.rebuys || 1;
    g.per.push(Number(p.cumEarnedClam) / creaturesEver / Number(CLAM));
    g.won += p.cumLootWon;
    g.lost += p.cumLootLost;
    g.ret += p.retirements;
    g.rebuy += p.rebuys;
    groups.set(p.archetype, g);
  }
  for (const [name, g] of groups) {
    console.log(
      `| ${name} | ${g.n} | ${fmt(g.spent)} | ${fmt(g.earned)} | ${pct(g.earned, g.spent)} | ` +
        `${Math.min(...g.per).toFixed(1)} | ${median(g.per).toFixed(1)} | ${Math.max(...g.per).toFixed(1)} | ` +
        `${fmt(g.won)} | ${fmt(g.lost)} | ${g.ret} | ${g.rebuy} |`,
    );
  }
  // Top-decile view: the "income" question is about the best players.
  const cohort = r.state.players.filter((p) => p.joinedDay === 0);
  const byEarn = [...cohort].sort((a, b) => (b.cumEarnedClam > a.cumEarnedClam ? 1 : -1));
  const top = byEarn.slice(0, Math.ceil(byEarn.length * 0.1));
  const topEarned = top.reduce((s, p) => s + p.cumEarnedClam, 0n);
  const topSpent = top.reduce((s, p) => s + p.cumSpentClam, 0n);
  const best = byEarn[0];
  console.log(`\n- Top 10% of players: earned ${fmt(topEarned)} vs spent ${fmt(topSpent)} CLAM (${pct(topEarned, topSpent)}); best single player earned ${fmt(best.cumEarnedClam)} on ${fmt(best.cumSpentClam)} spent (${best.archetype}).`);
  const paybackPlayers = cohort.filter((p) => p.cumEarnedClam >= p.cumSpentClam).length;
  console.log(`- Players who fully paid back within the year: ${paybackPlayers} of ${cohort.length}.`);
}

// Burn-cap sweep: at what cap multiple does the loop actually fire, and what does it do?
import {BURN_CAP, incomeAll} from "../dist/index.js";
console.log("\n## Burn-cap sweep (all features on, 365 days)\n");
console.log("| Cap (x entry) | CLAM/creature | Retirements | Re-buys | Re-buy CLAM (new money) | Refill / release | Pool day 365 | Ops treasury | Bots recovered | Casual recovered |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const cm of [0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 1, 4]) {
  const r = runScenario({...incomeAll, name: `cap-${cm}`, burnCap: {...BURN_CAP, capMultiple: cm}});
  const s = r.state;
  const rel = r.metrics.reduce((a, d) => a + d.release, 0n);
  const refill = s.cumPoolInflow - r.metrics[0].poolStart;
  const rec = (arch) => {
    const ps = s.players.filter((p) => p.archetype === arch);
    return pct(ps.reduce((a, p) => a + p.cumEarnedClam, 0n), ps.reduce((a, p) => a + p.cumSpentClam, 0n));
  };
  console.log(`| ${cm}x | ${cm * 100} | ${s.cumRetirements} | ${s.cumRebuys} | ${fmt(s.cumRebuyClam)} | ${pct(refill, rel)} | ${fmt(r.metrics[364].poolEnd)} | ${fmt(s.treasuryOps + s.treasuryFees)} | ${rec("bot")} | ${rec("casual")} |`);
}
