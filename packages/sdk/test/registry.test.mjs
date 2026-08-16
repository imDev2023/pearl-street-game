import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EQUITY_FEEDS,
  EQUITY_FEED_BY_SYMBOL,
  ROBINHOOD_MAINNET,
  ROBINHOOD_TESTNET,
  USDG_ADDRESS,
  USDG_DECIMALS,
} from "../dist/index.js";

test("registry has exactly the 35 feed-covered tickers", () => {
  assert.equal(EQUITY_FEEDS.length, 35);
});

test("every feed has a well-formed unique proxy address", () => {
  const seen = new Set();
  for (const f of EQUITY_FEEDS) {
    assert.match(f.proxy, /^0x[0-9a-fA-F]{40}$/, `${f.symbol} proxy malformed`);
    assert.ok(!seen.has(f.proxy.toLowerCase()), `${f.symbol} proxy duplicated`);
    seen.add(f.proxy.toLowerCase());
  }
});

test("symbol lookup covers every feed exactly once", () => {
  assert.equal(Object.keys(EQUITY_FEED_BY_SYMBOL).length, EQUITY_FEEDS.length);
  assert.equal(EQUITY_FEED_BY_SYMBOL["NVDA"]?.proxy, "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15");
});

test("chain constants match the verified reference", () => {
  assert.equal(ROBINHOOD_MAINNET.chainId, 4663);
  assert.equal(ROBINHOOD_TESTNET.chainId, 46630);
  assert.equal(USDG_ADDRESS, "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168");
  assert.equal(USDG_DECIMALS, 6);
});
