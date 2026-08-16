import {test} from "node:test";
import assert from "node:assert/strict";
import {ceilBps, formatUnits6, parseUnits6} from "../dist-test/format.js";

test("formatUnits6 renders 6-decimal amounts", () => {
  assert.equal(formatUnits6(525_000_000n), "525");
  assert.equal(formatUnits6(1_234_567n, 6), "1.234567");
  assert.equal(formatUnits6(-5n, 6), "-0.000005");
  assert.equal(formatUnits6(1_000_000_000_000n), "1,000,000");
});

test("parseUnits6 accepts decimals up to 6 places and rejects junk", () => {
  assert.equal(parseUnits6("1000"), 1_000_000_000n);
  assert.equal(parseUnits6("0.5"), 500_000n);
  assert.equal(parseUnits6("1.2345678"), null);
  assert.equal(parseUnits6("abc"), null);
  assert.equal(parseUnits6(""), null);
});

test("ceilBps matches ClamVault._ceilBps (fees round up)", () => {
  assert.equal(ceilBps(1n, 200n), 1n);
  assert.equal(ceilBps(100_000_000n, 200n), 2_000_000n);
  assert.equal(ceilBps(98_000_000n, 500n), 4_900_000n);
  assert.equal(ceilBps(3n, 200n), 1n);
});
