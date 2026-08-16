// Pre-sale matrix: FDV x absolute daily trading volume. For each cell: PEARL emitted,
// USD distributed to players, protocol trading revenue, per-archetype recovery and
// median daily USD income, and the pre-sale raise implied by the FDV and the 15% bucket.
// Usage: npm run build && node scripts/presale-matrix.mjs   (from packages/sim)

import {CLAM, incomeAll, PEARL_BASE, PEARL_TRADING, runScenario} from "../dist/index.js";

const FDVS = [10e6, 25e6, 50e6];
const VOLUMES = [200e3, 1e6, 2e6, 5e6];
const PRESALE_SHARE = 0.15; // the pre-sale bucket of the 1B cap
const usd = (v, dp = 0) => "$" + Number(v).toLocaleString("en-US", {minimumFractionDigits: dp, maximumFractionDigits: dp});
const clamUsd = (micro) => Number(micro) / Number(CLAM);
const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(0) + "%" : "-");

console.log("## Pre-sale matrix: FDV x daily PEARL trading volume (all features on, sellout, zero growth, 365 days)\n");
console.log("Assumptions: 1% LP fee tier, protocol owns 60% of the pool, PEARL emission = min(schedule, 25% x trailing-7-day revenue / price), 40% rewards allocation over 4 years, Founder's Wake +20%, vault 2%/5%, marketplace 7%.\n");
console.log("Pre-sale raise = FDV x 15% (the pre-sale bucket at listing price); 75% of it seeds the locked PEARL/USDG pool.\n");

const cells = new Map();
for (const fdv of FDVS) {
  for (const vol of VOLUMES) {
    const sc = {
      ...incomeAll,
      name: `presale-${fdv / 1e6}m-${vol / 1e3}k`,
      seed: 9500 + FDVS.indexOf(fdv) * 10 + VOLUMES.indexOf(vol),
      pearl: {...PEARL_BASE, marketCapUsd: fdv, trading: {...PEARL_TRADING, dailyVolumeUsd: vol}},
    };
    const r = runScenario(sc);
    const cohort = r.state.players.filter((p) => p.joinedDay === 0);
    const total = (p) => clamUsd(p.cumEarnedClam) + p.pearlEarnedUsd;
    const rec = (arch) => {
      const ps = cohort.filter((p) => p.archetype === arch);
      return ps.reduce((s, p) => s + total(p), 0) / ps.reduce((s, p) => s + clamUsd(p.cumSpentClam), 0);
    };
    const med = (arch) => {
      const v = cohort.filter((p) => p.archetype === arch).map((p) => total(p) / sc.days).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)] ?? 0;
    };
    const paidBack = cohort.filter((p) => total(p) >= clamUsd(p.cumSpentClam)).length;
    // Days until the median skilled player has recovered entry (if within horizon).
    cells.set(`${fdv}|${vol}`, {
      price: fdv / PEARL_BASE.hardCap,
      raise: fdv * PRESALE_SHARE,
      emitted: r.state.cumPearlEmitted,
      usdDist: r.state.cumPearlEmitted * (fdv / PEARL_BASE.hardCap),
      tradingRev: clamUsd(r.state.cumTradingRevenue),
      totalRev: clamUsd(r.state.cumRevenue),
      rec: {casual: rec("casual"), skilled: rec("skilled"), bot: rec("bot")},
      med: {casual: med("casual"), skilled: med("skilled"), bot: med("bot")},
      paidBack,
      cohort: cohort.length,
      pearlSharePct: (cohort.reduce((s, p) => s + p.pearlEarnedUsd, 0) / cohort.reduce((s, p) => s + total(p), 0)) * 100,
    });
  }
}

console.log("### Pre-sale sizing\n");
console.log("| FDV | PEARL price | Pre-sale raise (15%) | To locked liquidity (75%) | To ops (25%) |");
console.log("| --- | --- | --- | --- | --- |");
for (const fdv of FDVS) {
  const c = cells.get(`${fdv}|${VOLUMES[0]}`);
  console.log(`| ${usd(fdv)} | ${usd(c.price, 4)} | ${usd(c.raise)} | ${usd(c.raise * 0.75)} | ${usd(c.raise * 0.25)} |`);
}

console.log("\n### Protocol trading revenue and PEARL distributed to players (year 1)\n");
console.log("| FDV \\ Volume/day | " + VOLUMES.map((v) => usd(v)).join(" | ") + " |");
console.log("| --- | " + VOLUMES.map(() => "---").join(" | ") + " |");
for (const fdv of FDVS) {
  console.log(`| ${usd(fdv)} | ` + VOLUMES.map((v) => {
    const c = cells.get(`${fdv}|${v}`);
    return `rev ${usd(c.tradingRev)} / PEARL ${usd(c.usdDist)}`;
  }).join(" | ") + " |");
}

console.log("\n### Median daily USD income per player: casual (3 creatures) / skilled (6) / bot (15)\n");
console.log("| FDV \\ Volume/day | " + VOLUMES.map((v) => usd(v)).join(" | ") + " |");
console.log("| --- | " + VOLUMES.map(() => "---").join(" | ") + " |");
for (const fdv of FDVS) {
  console.log(`| ${usd(fdv)} | ` + VOLUMES.map((v) => {
    const c = cells.get(`${fdv}|${v}`);
    return `${usd(c.med.casual, 2)} / ${usd(c.med.skilled, 2)} / ${usd(c.med.bot, 2)}`;
  }).join(" | ") + " |");
}

console.log("\n### Entry recovered in year 1: casual / skilled / bot (100% = paid back)\n");
console.log("| FDV \\ Volume/day | " + VOLUMES.map((v) => usd(v)).join(" | ") + " |");
console.log("| --- | " + VOLUMES.map(() => "---").join(" | ") + " |");
for (const fdv of FDVS) {
  console.log(`| ${usd(fdv)} | ` + VOLUMES.map((v) => {
    const c = cells.get(`${fdv}|${v}`);
    return `${pct(c.rec.casual, 1)} / ${pct(c.rec.skilled, 1)} / ${pct(c.rec.bot, 1)}`;
  }).join(" | ") + " |");
}

console.log("\n### Players fully paid back within the year (of 1,700), and PEARL share of all earnings\n");
console.log("| FDV \\ Volume/day | " + VOLUMES.map((v) => usd(v)).join(" | ") + " |");
console.log("| --- | " + VOLUMES.map(() => "---").join(" | ") + " |");
for (const fdv of FDVS) {
  console.log(`| ${usd(fdv)} | ` + VOLUMES.map((v) => {
    const c = cells.get(`${fdv}|${v}`);
    return `${c.paidBack} (${c.pearlSharePct.toFixed(0)}% PEARL)`;
  }).join(" | ") + " |");
}

console.log("\n### Sanity: volume as a share of FDV (turnover), the number to check against comparable tokens\n");
console.log("| FDV \\ Volume/day | " + VOLUMES.map((v) => usd(v)).join(" | ") + " |");
console.log("| --- | " + VOLUMES.map(() => "---").join(" | ") + " |");
for (const fdv of FDVS) {
  console.log(`| ${usd(fdv)} | ` + VOLUMES.map((v) => ((v / fdv) * 100).toFixed(1) + "%/day").join(" | ") + " |");
}
