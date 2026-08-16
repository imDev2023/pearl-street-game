// The testnet player fleet: 30 wallets (6 named test wallets + 24 generated bots)
// playing the real economy on testnet 46630 at 10-minute game days, indefinitely.
// Idempotent: on restart it rebuilds its picture from chain state and carries on.
// Prices mirror the real mainnet Chainlink feeds each leg (HOOD is synthetic).
//
// Usage: node scripts/testnet-bots.mjs   (long-running; Ctrl-C to stop)

import {mkdirSync, readFileSync, writeFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {createPublicClient, decodeEventLog, defineChain, http} from "viem";
import {EQUITY_FEEDS} from "@pearlstreet/sdk";
import {mulberry32} from "@pearlstreet/sim";
import {loadAbis, REDEEM_PROPENSITY, SCRATCH_ASSETS, voyagesToday} from "../lib/common.mjs";
import {loadBotKeys, loadEnvKeys, makeClients, publicClient, sendRobust} from "../lib/testnet.mjs";

const abis = loadAbis();
const deployment = JSON.parse(readFileSync(join(SCRATCH_ASSETS, "testnet-deployment.json"), "utf8"));
const addr = deployment.addresses;
const DAY_LENGTH = deployment.dayLength;
const LEG = DAY_LENGTH / 3;
const GENESIS = deployment.genesis;
const BPS = 10_000n;
const CLAM = 1_000_000n;
const PRICE = 100n * CLAM; // public price on testnet: no allowlist, full realism
const STATE_PATH = join(SCRATCH_ASSETS, "testnet-state.json");
const SEASON_DAYS = 90;

const robinhoodMainnet = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: {name: "Ether", symbol: "ETH", decimals: 18},
  rpcUrls: {default: {http: ["https://rpc.mainnet.chain.robinhood.com"]}},
});
const mainnetClient = createPublicClient({chain: robinhoodMainnet, transport: http()});
const TICKERS = ["AAPL", "NVDA", "TSLA", "AMZN", "MSFT", "GOOGL", "META", "HOOD"];
const mainnetProxies = TICKERS.map((sym) => EQUITY_FEEDS.find((f) => f.symbol === sym)?.proxy ?? null);
const aggAbi = abis.MockAggregator;

// ---------- Fleet ----------

const envKeys = loadEnvKeys();
const namedPlans = [
  ["WALLET_TEST_PK_1", "casual", 3], ["WALLET_TEST_PK_2", "casual", 3],
  ["WALLET_TEST_PK_3", "skilled", 6], ["WALLET_TEST_PK_4", "skilled", 6],
  ["WALLET_TEST_PK_5", "bot", 15], ["WALLET_TEST_PK_6", "bot", 15],
];
const botKeys = loadBotKeys();
const botPlans = botKeys.map((key, i) =>
  [key, i < 17 ? "casual" : i < 22 ? "skilled" : "bot", i < 17 ? 3 : i < 22 ? 6 : 15]);

const ops = makeClients(envKeys.MAIN_WALLET_PRIVATE_KEY);
const players = [
  ...namedPlans.map(([name, archetype, creatures]) =>
    ({name, archetype, creatures, ...makeClients(envKeys[name])})),
  ...botPlans.map(([key, archetype, creatures], i) =>
    ({name: `BOT_${i + 1}`, archetype, creatures, ...makeClients(key)})),
];
const rng = mulberry32(46_630);
const read = (address, abi, functionName, args = []) =>
  publicClient.readContract({address, abi, functionName, args});

const state = existsSync(STATE_PATH)
  ? JSON.parse(readFileSync(STATE_PATH, "utf8"))
  : {poolHistory: [], claimedByPlayer: {}, doubloonSeasonBase: {}, lastSettledSeason: 0, startedAt: new Date().toISOString()};

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

// ---------- Idempotent onboarding ----------

async function onboard(p) {
  const minted = await read(addr.PearlCreatures, abis.PearlCreatures, "mintedBy", [p.account.address]);
  const want = BigInt(p.creatures) - minted;
  if (want > 0n) {
    const total = PRICE * want;
    const gross = (total * BPS) / (BPS - 100n) + 1n;
    await sendRobust(p.wallet, {address: addr.MockUSDG, abi: abis.MockUSDG, functionName: "faucet", args: [gross]});
    await sendRobust(p.wallet, {address: addr.MockUSDG, abi: abis.MockUSDG, functionName: "approve", args: [addr.ClamVault, gross]});
    await sendRobust(p.wallet, {address: addr.ClamVault, abi: abis.ClamVault, functionName: "deposit", args: [gross]});
    await sendRobust(p.wallet, {address: addr.ClamToken, abi: abis.ClamToken, functionName: "approve", args: [addr.PearlCreatures, total]});
    await sendRobust(p.wallet, {address: addr.PearlCreatures, abi: abis.PearlCreatures, functionName: "buyGen0", args: [want]});
    log(`${p.name}: bought ${want} creatures`);
  }
  // Rebuild owned creature ids + sectors from chain.
  const totalMinted = await read(addr.PearlCreatures, abis.PearlCreatures, "totalMinted");
  p.creatureIds = [];
  p.sectors = {};
  for (let id = 1n; id <= totalMinted; id++) {
    if ((await read(addr.PearlCreatures, abis.PearlCreatures, "ownerOf", [id])) === p.account.address) {
      p.creatureIds.push(id);
      p.sectors[id] = Number(await read(addr.PearlCreatures, abis.PearlCreatures, "sectorOf", [id]));
    }
  }
  p.parties = [];
  for (let i = 0; i < p.creatureIds.length; i += 3) p.parties.push(p.creatureIds.slice(i, i + 3));
}

// ---------- Prices ----------

let hoodPrice = 100e8;
async function pushPrices() {
  for (let t = 0; t < TICKERS.length; t++) {
    let answer;
    if (mainnetProxies[t]) {
      try {
        const [, mainAnswer] = await mainnetClient.readContract({
          address: mainnetProxies[t], abi: aggAbi, functionName: "latestRoundData",
        });
        answer = mainAnswer;
      } catch {
        continue; // mainnet read failed: leave the testnet feed as-is (it may go stale - fine)
      }
    } else {
      hoodPrice = Math.max(1e8, Math.round(hoodPrice * (1 + (rng() - 0.5) * 0.01)));
      answer = BigInt(hoodPrice);
    }
    try {
      await sendRobust(ops.wallet, {address: addr.feeds[t], abi: aggAbi, functionName: "setAnswer", args: [answer]});
    } catch (error) {
      log(`price push ${TICKERS[t]} failed:`, error.message);
    }
  }
}

// ---------- The leg loop ----------

const pendingSettle = []; // {voyageId, player, endTime, day}
const pendingClaim = new Map(); // day -> [{voyageId, player}]

function pickTicker(p, party) {
  if (p.archetype !== "casual") {
    for (const id of party) if (p.sectors[id] < TICKERS.length) return p.sectors[id];
  }
  return Math.floor(rng() * TICKERS.length);
}

async function runLeg(day, legOfDay) {
  // Settle everything whose voyage time has elapsed (and is still in its window).
  for (let i = pendingSettle.length - 1; i >= 0; i--) {
    const v = pendingSettle[i];
    if (Date.now() / 1000 < v.endTime) continue;
    pendingSettle.splice(i, 1);
    try {
      await sendRobust(ops.wallet, {address: addr.VoyageGame, abi: abis.VoyageGame, functionName: "settle", args: [v.voyageId]});
      if (!pendingClaim.has(v.day)) pendingClaim.set(v.day, []);
      pendingClaim.get(v.day).push({voyageId: v.voyageId, player: v.player});
    } catch (error) {
      log(`settle ${v.voyageId} failed:`, error.message);
    }
  }

  // Start this leg's voyages, per archetype energy plan.
  for (const p of players) {
    for (const party of p.parties) {
      if (voyagesToday(p.archetype, rng) <= legOfDay) continue;
      try {
        const receipt = await sendRobust(p.wallet, {
          address: addr.VoyageGame, abi: abis.VoyageGame, functionName: "startVoyage",
          args: [party, pickTicker(p, party)],
        });
        for (const logEntry of receipt.logs) {
          try {
            const ev = decodeEventLog({abi: abis.VoyageGame, data: logEntry.data, topics: logEntry.topics});
            if (ev.eventName === "VoyageStarted") {
              // Trust the chain's day, not the driver's: a slow leg can straddle a boundary.
              pendingSettle.push({
                voyageId: ev.args.voyageId, player: p, endTime: Date.now() / 1000 + LEG,
                day: Number(ev.args.day),
              });
            }
          } catch {}
        }
      } catch (error) {
        log(`${p.name} startVoyage failed:`, error.message);
      }
    }
  }
}

async function runDayBoundary(day) {
  try {
    await sendRobust(ops.wallet, {address: addr.VoyageGame, abi: abis.VoyageGame, functionName: "poke", args: []});
  } catch (error) {
    log("poke failed:", error.message);
  }

  // Claims for every day whose window is open (D+2 .. D+9), then archetype redemptions.
  const claimable = [];
  for (const [d, list] of pendingClaim) {
    if (day >= d + 2 && day <= d + 9) {
      claimable.push(...list);
      pendingClaim.delete(d);
    } else if (day > d + 9) {
      pendingClaim.delete(d); // expired: sweep returns it to the pool
    }
  }
  const earned = new Map();
  for (const c of claimable) {
    try {
      const receipt = await sendRobust(c.player.wallet, {address: addr.VoyageGame, abi: abis.VoyageGame, functionName: "claim", args: [c.voyageId]});
      for (const logEntry of receipt.logs) {
        try {
          const ev = decodeEventLog({abi: abis.VoyageGame, data: logEntry.data, topics: logEntry.topics});
          if (ev.eventName === "VoyageClaimed") {
            earned.set(c.player, (earned.get(c.player) ?? 0n) + ev.args.payout);
            state.claimedByPlayer[c.player.name] =
              (BigInt(state.claimedByPlayer[c.player.name] ?? "0") + ev.args.payout).toString();
          }
        } catch {}
      }
    } catch (error) {
      log(`claim ${c.voyageId} failed:`, error.message);
    }
  }
  for (const [p, amount] of earned) {
    const share = REDEEM_PROPENSITY[p.archetype];
    if (share === 0) continue;
    const toRedeem = (amount * BigInt(Math.round(share * 10_000))) / BPS;
    if (toRedeem === 0n) continue;
    try {
      await sendRobust(p.wallet, {address: addr.ClamVault, abi: abis.ClamVault, functionName: "redeem", args: [toRedeem]});
    } catch (error) {
      log(`${p.name} redeem failed:`, error.message);
    }
  }

  // Housekeeping.
  if (day >= 10) {
    try {
      const swept = await read(addr.VoyageGame, abis.VoyageGame, "sweptOf", [BigInt(day - 10)]);
      if (!swept) await sendRobust(ops.wallet, {address: addr.VoyageGame, abi: abis.VoyageGame, functionName: "sweep", args: [BigInt(day - 10)]});
    } catch (error) {
      log("sweep failed:", error.message);
    }
  }
  try {
    await sendRobust(ops.wallet, {address: addr.FeeRouter, abi: abis.FeeRouter, functionName: "flush", args: []});
  } catch (error) {
    log("flush failed:", error.message);
  }

  // Season settlement: ops posts the pot to the top 20% by season Doubloons.
  const season = Math.floor(day / SEASON_DAYS);
  if (season > state.lastSettledSeason && day % SEASON_DAYS === 0) {
    try {
      const standings = [];
      for (const p of players) {
        const total = await read(addr.Doubloons, abis.Doubloons, "balanceOf", [p.account.address]);
        const base = BigInt(state.doubloonSeasonBase[p.name] ?? "0");
        standings.push({p, score: total - base});
        state.doubloonSeasonBase[p.name] = total.toString();
      }
      standings.sort((a, b) => (b.score > a.score ? 1 : -1));
      const winners = standings.slice(0, Math.max(1, Math.ceil(standings.length * 0.2)))
        .filter((s) => s.score > 0n);
      const pot = await read(addr.ClamToken, abis.ClamToken, "balanceOf", [addr.LeaderboardPot]);
      const totalScore = winners.reduce((s, w) => s + w.score, 0n);
      if (totalScore > 0n && pot > 0n) {
        const amounts = winners.map((w) => (pot * w.score) / totalScore);
        await sendRobust(ops.wallet, {
          address: addr.LeaderboardPot, abi: abis.LeaderboardPot, functionName: "settleSeason",
          args: [BigInt(season), winners.map((w) => w.p.account.address), amounts],
        });
        log(`season ${season} settled: ${winners.length} winners share ${pot} micro-CLAM`);
      }
      state.lastSettledSeason = season;
    } catch (error) {
      log("season settle failed:", error.message);
    }
  }

  // Dashboard state snapshot.
  const pool = await read(addr.ClamToken, abis.ClamToken, "balanceOf", [addr.PrizePool]);
  const surplus = await read(addr.ClamVault, abis.ClamVault, "reserveSurplus");
  state.poolHistory.push({t: Date.now(), day, pool: pool.toString(), surplus: surplus.toString()});
  if (surplus !== 0n) log(`!!! VAULT INVARIANT VIOLATED: surplus ${surplus}`);
  const snapshot = [];
  for (const p of players) {
    snapshot.push({
      name: p.name,
      archetype: p.archetype,
      address: p.account.address,
      creatures: p.creatureIds.length,
      clam: (await read(addr.ClamToken, abis.ClamToken, "balanceOf", [p.account.address])).toString(),
      doubloons: (await read(addr.Doubloons, abis.Doubloons, "balanceOf", [p.account.address])).toString(),
      claimed: state.claimedByPlayer[p.name] ?? "0",
    });
  }
  state.players = snapshot;
  state.day = day;
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  log(`day ${day}: pool ${Number(pool) / 1e6} CLAM, surplus ${surplus}`);
}

// ---------- Main ----------

mkdirSync(SCRATCH_ASSETS, {recursive: true});
log(`fleet: ${players.length} players; onboarding...`);
for (const p of players) await onboard(p);
log("onboarding complete; entering the leg loop (Ctrl-C to stop)");
await pushPrices();

let lastLeg = -1;
let lastDay = -1;
for (;;) {
  const now = Math.floor(Date.now() / 1000);
  const leg = Math.floor((now - GENESIS) / LEG);
  if (leg > lastLeg) {
    lastLeg = leg;
    const day = Math.floor((now - GENESIS) / DAY_LENGTH);
    const legOfDay = leg % 3;
    await pushPrices();
    if (day > lastDay) {
      lastDay = day;
      await runDayBoundary(day);
    }
    await runLeg(day, legOfDay);
  }
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}
