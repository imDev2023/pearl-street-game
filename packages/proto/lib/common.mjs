// Shared plumbing for the prototype drivers: ABI loading from Foundry artifacts,
// broadcast address parsing, archetype plans, and the seeded market regimes
// (imported from @pearlstreet/sim so both sides of the diff draw the same model).

import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(here, "..", "..", "..");
export const CONTRACTS_DIR = join(REPO_ROOT, "contracts");
export const SCRATCH_ASSETS = join(REPO_ROOT, ".scratch", "economy-prototype", "assets");

const CONTRACT_NAMES = [
  "MockUSDG",
  "ClamToken",
  "Doubloons",
  "PearlCreatures",
  "VoyageGame",
  "LeaderboardPot",
  "PrizePool",
  "FeeRouter",
  "ClamVault",
  "MockAggregator",
];

export function loadAbis() {
  const abis = {};
  for (const name of CONTRACT_NAMES) {
    const artifact = JSON.parse(
      readFileSync(join(CONTRACTS_DIR, "out", `${name}.sol`, `${name}.json`), "utf8"),
    );
    abis[name] = artifact.abi;
  }
  return abis;
}

/** Addresses from the latest forge broadcast for a chain id, keyed by contract name.
 *  MockAggregator deploys eight times; those become an array in feed order. */
export function addressesFromBroadcast(chainId) {
  const run = JSON.parse(
    readFileSync(
      join(CONTRACTS_DIR, "broadcast", "DeployPrototype.s.sol", String(chainId), "run-latest.json"),
      "utf8",
    ),
  );
  const out = {feeds: []};
  for (const tx of run.transactions) {
    if (tx.transactionType !== "CREATE") continue;
    if (tx.contractName === "MockAggregator") out.feeds.push(tx.contractAddress);
    else out[tx.contractName] = tx.contractAddress;
  }
  return out;
}

/** The ~30-player population: 21 casual, 7 skilled, 2 bot fleets. Mirrors the sim mix. */
export function archetypePlan() {
  const plan = [];
  for (let i = 0; i < 21; i++) plan.push({archetype: "casual", creatures: 3});
  for (let i = 0; i < 7; i++) plan.push({archetype: "skilled", creatures: 6});
  for (let i = 0; i < 2; i++) plan.push({archetype: "bot", creatures: 15});
  return plan;
}

/** Party voyages per game day, by archetype (energy ceiling is 3). */
export function voyagesToday(archetype, rng) {
  const efficiency = {casual: 0.55, skilled: 0.9, bot: 1.0}[archetype];
  const ideal = 3 * efficiency;
  let n = Math.floor(ideal);
  if (rng() < ideal - n) n += 1;
  return n;
}

/** Redeem share of the day's claimed earnings, by archetype. Mirrors packages/sim. */
export const REDEEM_PROPENSITY = {casual: 0, skilled: 0.5, bot: 0.95};

/** The regime schedule shared by the on-chain replay and the sim comparison run. */
export function regimeForDay(day) {
  if (day >= 60 && day < 75) return "crash";
  if (day >= 75 && day < 90) return "whipsaw";
  return day % 10 < 7 ? "flat" : "bull";
}
