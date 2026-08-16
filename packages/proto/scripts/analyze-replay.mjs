// Turns .scratch/economy-prototype/assets/anvil-replay.json into the markdown tables
// for the prototype report: pool trajectory + sim diff, per-archetype player economics,
// protocol revenue, and the three crux answers (player income, protocol income, min/max).

import {readFileSync} from "node:fs";
import {join} from "node:path";
import {SCRATCH_ASSETS} from "../lib/common.mjs";

const data = JSON.parse(readFileSync(join(SCRATCH_ASSETS, "anvil-replay.json"), "utf8"));
const CLAM = 1e6;
const fmt = (v, dp = 2) => (Number(v) / CLAM).toLocaleString("en-US", {maximumFractionDigits: dp});

console.log(`## Anvil replay: ${data.days} game days, ${data.totalCreatures} creatures, seed ${data.seed}\n`);
if (data.invariantFailures.length > 0) {
  console.log("### INVARIANT FAILURES\n");
  for (const f of data.invariantFailures) console.log("- " + f);
  process.exit(1);
}

console.log("### Pool trajectory: real contracts vs simulator\n");
console.log("| Day | Regime | Pool on-chain (CLAM) | Pool simulator | Drift | Released | Voyages |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
for (const d of [0, 7, 14, 30, 45, 60, 75, 90, 105, data.days - 1]) {
  const m = data.metrics.find((x) => x.day === d);
  const s = data.simMetrics.find((x) => x.day === d);
  if (!m || !s) continue;
  const drift = Number(s.pool) > 0 ? ((Number(m.poolEnd) - Number(s.pool)) / Number(s.pool) * 100).toFixed(1) : "-";
  console.log(`| ${d} | ${m.regime} | ${fmt(m.poolEnd, 0)} | ${fmt(s.pool, 0)} | ${drift}% | ${fmt(m.released)} | ${m.voyages} |`);
}

console.log("\n### Player economics by archetype (lifetime, on-chain)\n");
const groups = {};
for (const p of data.finalState.players) {
  const g = groups[p.archetype] ?? (groups[p.archetype] = {players: 0, creatures: 0, claimed: 0n, spent: 0n, redeemed: 0n});
  g.players += 1;
  g.creatures += p.creatures;
  g.claimed += BigInt(p.claimed);
  g.spent += BigInt(p.spentUsdg);
  g.redeemed += BigInt(p.redeemedUsdg);
}
console.log("| Archetype | Players | Creatures | Hauls claimed (CLAM) | Per creature | Entry cost (USDG) | Recovered |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
let minPer = Infinity, maxPer = 0;
for (const p of data.finalState.players) {
  const per = Number(p.claimed) / p.creatures;
  minPer = Math.min(minPer, per);
  maxPer = Math.max(maxPer, per);
}
for (const [name, g] of Object.entries(groups)) {
  const pct = ((Number(g.claimed) / Number(g.spent)) * 100).toFixed(1);
  console.log(`| ${name} | ${g.players} | ${g.creatures} | ${fmt(g.claimed)} | ${fmt(g.claimed / BigInt(g.creatures))} | ${fmt(g.spent, 0)} | ${pct}% |`);
}

console.log("\n### Protocol economics\n");
const f = data.finalState;
console.log(`- Ops treasury (70% of sale + 50% of fees): ${fmt(f.treasury, 0)} CLAM.`);
console.log(`- Prize pool remaining: ${fmt(f.pool, 0)} CLAM; leaderboard pot: ${fmt(f.leaderboardPot, 0)} CLAM.`);
console.log(`- CLAM supply (== vault USDG reserve): ${fmt(f.clamSupply, 0)}.`);
console.log(`- Doubloons earned (soulbound): ${Number(f.doubloonsEarned).toLocaleString()}.`);
console.log(`- Per-creature lifetime haul range: ${fmt(minPer)} (min) to ${fmt(maxPer)} (max) CLAM over ${data.days} days.`);

const day1 = data.metrics.find((m) => m.day === 1);
const last = data.metrics[data.metrics.length - 1];
console.log(`- Pool decay check: day-1 release ${fmt(day1.released)} vs day-${last.day} release ${fmt(last.released)} (the 1.5% cap tracking the shrinking balance).`);
