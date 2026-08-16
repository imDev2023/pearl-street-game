// docs/ECONOMY.md is the single source of truth for every economic constant.
// This test parses the document and fails if any constant in src/constants.ts
// drifts from the documented value, so the simulator can never silently diverge.

import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import * as C from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const doc = readFileSync(join(here, "..", "..", "..", "docs", "ECONOMY.md"), "utf8");

function documented(pattern, label) {
  const match = doc.match(pattern);
  assert.ok(match, `ECONOMY.md no longer contains the documented ${label} (pattern ${pattern})`);
  return match[1].replaceAll(",", "");
}

test("Gen-0 sale constants match ECONOMY.md", () => {
  assert.equal(C.GEN0_SUPPLY, Number(documented(/Supply \| \*\*([\d,]+) creatures\*\*/, "Gen-0 supply")));
  assert.equal(
    C.GEN0_PRICE_PUBLIC / C.CLAM,
    BigInt(documented(/\*\*(\d+) CLAM\*\* public/, "public mint price")),
  );
  assert.equal(
    C.GEN0_PRICE_ALLOWLIST / C.CLAM,
    BigInt(documented(/public; (\d+) CLAM allowlist/, "allowlist mint price")),
  );
  assert.equal(C.GEN0_PER_WALLET_CAP, Number(documented(/Per-wallet cap \| (\d+)/, "per-wallet cap")));
  const poolPct = Number(documented(/\*\*(\d+)% Season One prize pool/, "sale-to-pool split"));
  assert.equal(C.SALE_TO_POOL_BPS, BigInt(poolPct * 100));
  const opsPct = Number(documented(/prize pool \/ (\d+)% operations/, "sale-to-ops split"));
  assert.equal(C.SALE_TO_OPS_BPS, BigInt(opsPct * 100));
  assert.equal(C.SALE_TO_POOL_BPS + C.SALE_TO_OPS_BPS, C.BPS);
});

test("play-loop constants match ECONOMY.md", () => {
  assert.equal(C.PARTY_SIZE, Number(documented(/Party size \| (\d+) creatures/, "party size")));
  assert.equal(C.ENERGY_PER_DAY, Number(documented(/Energy \| (\d+) per creature per day/, "energy")));
  assert.equal(C.VOYAGE_ENERGY_COST, Number(documented(/Voyage cost \| (\d+) energy/, "voyage cost")));
  assert.equal(
    C.VOYAGE_DURATION_HOURS,
    Number(documented(/Voyage duration \| (\d+) hours/, "voyage duration")),
  );
  assert.equal(C.MAX_VOYAGES_PER_DAY, C.ENERGY_PER_DAY / C.VOYAGE_ENERGY_COST);
  const [, lo, hi] = doc.match(/Market modifier \| ([\d.]+)x to ([\d.]+)x/) ?? [];
  assert.ok(lo && hi, "ECONOMY.md no longer documents the market modifier range");
  assert.equal(C.MODIFIER_MIN_BPS, BigInt(Math.round(Number(lo) * 10_000)));
  assert.equal(C.MODIFIER_MAX_BPS, BigInt(Math.round(Number(hi) * 10_000)));
  assert.equal(
    C.AFFINITY_BONUS_BPS,
    BigInt(Number(documented(/Affinity bonus \| \+(\d+)%/, "affinity bonus")) * 100),
  );
  assert.equal(
    C.DOUBLOONS_PER_VOYAGE,
    Number(documented(/Doubloons per voyage \| (\d+) \+ performance bonus/, "doubloons per voyage")),
  );
});

test("prize-pool and revenue-routing constants match ECONOMY.md", () => {
  const releasePct = documented(/at most \*\*([\d.]+)% of its current balance per day\*\*/, "daily release cap");
  assert.equal(C.DAILY_RELEASE_BPS, BigInt(Math.round(Number(releasePct) * 100)));
  const haulPct = Number(documented(/(\d+)% of the daily release funds voyage hauls/, "haul split"));
  assert.equal(C.RELEASE_TO_HAULS_BPS, BigInt(haulPct * 100));
  const lbPct = Number(documented(/(\d+)% accrues to the season-end leaderboard pot/, "leaderboard split"));
  assert.equal(C.RELEASE_TO_LEADERBOARD_BPS, BigInt(lbPct * 100));
  assert.equal(C.RELEASE_TO_HAULS_BPS + C.RELEASE_TO_LEADERBOARD_BPS, C.BPS);
  const feePct = Number(
    documented(/\*\*(\d+)% of all protocol fee revenue flows into the active season prize pool/, "fee routing"),
  );
  assert.equal(C.FEES_TO_POOL_BPS, BigInt(feePct * 100));
  const [, mintFee, redeemFee] = doc.match(/CLAM vault \| (\d+)% mint \+ (\d+)% redeem/) ?? [];
  assert.ok(mintFee && redeemFee, "ECONOMY.md no longer documents the vault fees");
  assert.equal(C.VAULT_MINT_FEE_BPS, BigInt(Number(mintFee) * 100));
  assert.equal(C.VAULT_REDEEM_FEE_BPS, BigInt(Number(redeemFee) * 100));
});

test("supply-control constants match ECONOMY.md", () => {
  assert.equal(
    C.GEN1_CAP_PER_SEASON,
    Number(documented(/Gen-1 capped at \*\*([\d,]+) per season\*\*/, "Gen-1 season cap")),
  );
  assert.equal(
    C.BREED_LIFETIME_LIMIT,
    Number(documented(/(\d+)-breed lifetime limit per creature/, "breed lifetime limit")),
  );
});
