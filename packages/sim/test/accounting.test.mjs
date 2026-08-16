// Exact-value accounting checks on a one-player micro scenario: the vault fee skim,
// the 30/70 sale split, the 100%-to-pool fee routing, and the 1.5% release, to the micro-CLAM.

import assert from "node:assert/strict";
import test from "node:test";
import {runScenario} from "../dist/index.js";

const micro = {
  name: "micro",
  seed: 42,
  days: 1,
  regimeForDay: () => "flat",
  joins: (day) => (day === 0 ? [{archetype: "casual", creaturesWanted: 1}] : []),
  leaveFraction: () => 0,
  staleChance: 0,
};

test("one allowlist mint: fee skim, sale split, and fee routing to the micro-CLAM", () => {
  const {metrics, state} = runScenario(micro);
  // Price 80 CLAM allowlist. Deposit D = ceil(80e6 * 10000 / 9800) = 81,632,654 micro.
  // Mint fee = ceil(2% of D) = 1,632,654; player nets exactly the 80 CLAM price.
  // Pool = 30% of price (24,000,000) + 100% of fee (1,632,654) = 25,632,654.
  assert.equal(state.clamSupply, 81_632_654n);
  assert.equal(state.vaultReserve, 81_632_654n);
  assert.equal(state.treasuryOps, 56_000_000n);
  assert.equal(state.treasuryFees, 0n);
  assert.equal(metrics[0].poolStart, 25_632_654n);
  // Daily release = floor(1.5% of pool) = 384,489; hauls 80% = 307,591; leaderboard 76,898.
  assert.equal(metrics[0].release, 384_489n);
  assert.equal(metrics[0].leaderboardPot, 76_898n);
  assert.ok(metrics[0].haulsDistributed <= 307_591n);
});
