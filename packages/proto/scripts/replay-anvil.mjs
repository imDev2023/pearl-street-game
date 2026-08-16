// Full-horizon economy replay against the REAL contracts on a local Anvil node with
// time warping, plus a matching @pearlstreet/sim run for the day-by-day diff.
// Hard-asserts the economic invariants after every game day; exits non-zero on violation.
//
// Usage: node scripts/replay-anvil.mjs [--days N]   (default 120)

import {spawn, execFileSync} from "node:child_process";
import {mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {createPublicClient, createTestClient, createWalletClient, decodeEventLog, http, parseEther} from "viem";
import {mnemonicToAccount} from "viem/accounts";
import {foundry} from "viem/chains";
import {makeMarketDay, mulberry32, runScenario, VAULT_MINT_FEE_BPS} from "@pearlstreet/sim";
import {
  addressesFromBroadcast,
  archetypePlan,
  CONTRACTS_DIR,
  loadAbis,
  REDEEM_PROPENSITY,
  regimeForDay,
  SCRATCH_ASSETS,
  voyagesToday,
} from "../lib/common.mjs";

const DAYS = Number(process.argv.includes("--days") ? process.argv[process.argv.indexOf("--days") + 1] : 120);
// Dedicated port: NEVER 8545 - other projects on this machine run their own nodes there.
const PORT = 9556;
const RPC = `http://127.0.0.1:${PORT}`;
const MNEMONIC = "test test test test test test test test test test test junk";
const DAY = 86_400;
const SEED = 7007;
const NUM_TICKERS = 8;
const CLAM = 1_000_000n;
const BPS = 10_000n;

const rng = mulberry32(SEED);
const foundryPath = join(process.env.HOME, ".foundry", "bin");
process.env.PATH = `${foundryPath}:${process.env.PATH}`;

// ---------- Anvil + deployment ----------

// Refuse to run if the port is taken: silently reusing a stranger's node corrupts the run.
try {
  await fetch(RPC, {method: "POST", body: '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'});
  console.error(`port ${PORT} is already in use - kill the stale node first (lsof -i :${PORT})`);
  process.exit(1);
} catch {}

console.log("starting anvil...");
const anvil = spawn(join(foundryPath, "anvil"), ["-a", "40", "--port", String(PORT), "--silent"], {stdio: "ignore"});
process.on("exit", () => anvil.kill());
await new Promise((resolve) => setTimeout(resolve, 1500));

const deployer = mnemonicToAccount(MNEMONIC, {addressIndex: 0});
console.log("deploying economy (DAY_LENGTH=86400)...");
execFileSync(
  join(foundryPath, "forge"),
  ["script", "script/DeployPrototype.s.sol", "--rpc-url", RPC, "--broadcast", "--private-key",
    // Anvil's canonical first key; local test node only, carries no value anywhere real.
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
  {cwd: CONTRACTS_DIR, env: {...process.env, DAY_LENGTH: String(DAY)}, stdio: "pipe"},
);
const addr = addressesFromBroadcast(31337);
const abis = loadAbis();
console.log("deployed:", Object.fromEntries(Object.entries(addr).map(([k, v]) => [k, Array.isArray(v) ? v.length + " feeds" : v])));

// Anvil automines: receipts land instantly, so poll fast instead of viem's 4s default.
const pub = createPublicClient({chain: foundry, transport: http(RPC), pollingInterval: 20});
const testClient = createTestClient({chain: foundry, mode: "anvil", transport: http(RPC)});

const players = archetypePlan().map((plan, i) => ({
  ...plan,
  account: mnemonicToAccount(MNEMONIC, {addressIndex: i + 1}),
  wallet: null,
  partyIds: [],
  sectors: [],
  claimedTotal: 0n,
  spentUsdg: 0n,
  redeemedUsdg: 0n,
}));
for (const p of players) {
  p.wallet = createWalletClient({account: p.account, chain: foundry, transport: http(RPC)});
}
const opsWallet = createWalletClient({account: deployer, chain: foundry, transport: http(RPC)});

async function send(wallet, address, abi, functionName, args = []) {
  for (let attempt = 0; ; attempt++) {
    try {
      const hash = await wallet.writeContract({address, abi, functionName, args});
      return await pub.waitForTransactionReceipt({hash, timeout: 15_000});
    } catch (error) {
      if (attempt >= 2) throw error;
      console.log(`retrying ${functionName} (${error.shortMessage ?? error.message})`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

const read = (address, abi, functionName, args = []) =>
  pub.readContract({address, abi, functionName, args});

// ---------- Setup: allowlist, funding, Gen-0 sale ----------

console.log("allowlisting players and running the Gen-0 sale...");
await send(opsWallet, addr.PearlCreatures, abis.PearlCreatures, "setAllowlisted",
  [players.map((p) => p.account.address), true]);

const PRICE = 80n * CLAM; // allowlist price, matching the sim (first tranche is allowlisted)
for (const p of players) {
  const total = PRICE * BigInt(p.creatures);
  const gross = (total * BPS) / (BPS - VAULT_MINT_FEE_BPS) + 1n; // gross USDG so the net CLAM covers the price
  p.spentUsdg = gross;
  await send(p.wallet, addr.MockUSDG, abis.MockUSDG, "faucet", [gross]);
  await send(p.wallet, addr.MockUSDG, abis.MockUSDG, "approve", [addr.ClamVault, gross]);
  await send(p.wallet, addr.ClamVault, abis.ClamVault, "deposit", [gross]);
  await send(p.wallet, addr.ClamToken, abis.ClamToken, "approve", [addr.PearlCreatures, total]);
  const before = await read(addr.PearlCreatures, abis.PearlCreatures, "totalMinted");
  await send(p.wallet, addr.PearlCreatures, abis.PearlCreatures, "buyGen0", [BigInt(p.creatures)]);
  const ids = [];
  for (let id = before + 1n; id <= before + BigInt(p.creatures); id++) {
    ids.push(id);
    p.sectors.push(Number(await read(addr.PearlCreatures, abis.PearlCreatures, "sectorOf", [id])));
  }
  for (let i = 0; i < ids.length; i += 3) p.partyIds.push(ids.slice(i, i + 3));
}
const totalCreatures = players.reduce((s, p) => s + p.creatures, 0);
console.log(`sale done: ${totalCreatures} creatures, pool seeded with ${await read(addr.ClamToken, abis.ClamToken, "balanceOf", [addr.PrizePool])} micro-CLAM`);

// ---------- Price pushing ----------

let prices = Array.from({length: NUM_TICKERS}, () => 100e8);
async function pushLegPrices(day) {
  const market = makeMarketDay(regimeForDay(day), day, rng, 0);
  for (let t = 0; t < NUM_TICKERS; t++) {
    const legReturn = market.tickerReturns[t] / 3; // one 8h leg of the daily move
    prices[t] = Math.max(1e8, Math.round(prices[t] * (1 + legReturn)));
    await send(opsWallet, addr.feeds[t], abis.MockAggregator, "setAnswer", [BigInt(prices[t])]);
  }
}

// ---------- Voyage bookkeeping ----------

/** voyages[day] = [{voyageId, player}] awaiting claim at day+2. */
const voyagesByDay = new Map();

function voyageIdFromReceipt(receipt) {
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({abi: abis.VoyageGame, data: log.data, topics: log.topics});
      if (ev.eventName === "VoyageStarted") return ev.args.voyageId;
    } catch {}
  }
  throw new Error("VoyageStarted event not found");
}

function payoutFromReceipt(receipt) {
  for (const log of receipt.logs) {
    try {
      const ev = decodeEventLog({abi: abis.VoyageGame, data: log.data, topics: log.topics});
      if (ev.eventName === "VoyageClaimed") return ev.args.payout;
    } catch {}
  }
  return 0n;
}

function pickTicker(p, party) {
  if (p.archetype === "casual") return Math.floor(rng() * NUM_TICKERS);
  // Skilled players and bots chase affinity: sail a ticker matching a party sector.
  for (const id of party) {
    const sector = p.sectors[p.partyIds.flat().indexOf(id)];
    if (sector < NUM_TICKERS) return sector;
  }
  return Math.floor(rng() * NUM_TICKERS);
}

// ---------- The day loop ----------

const metrics = [];
const invariantFailures = [];
mkdirSync(SCRATCH_ASSETS, {recursive: true});

for (let day = 0; day < DAYS; day++) {
  const chainDay = await read(addr.VoyageGame, abis.VoyageGame, "currentDay");
  if (Number(chainDay) !== day) {
    throw new Error(`clock drift: driver day ${day} but chain day ${chainDay} - fix the warp cadence`);
  }
  const poolBefore = await read(addr.ClamToken, abis.ClamToken, "balanceOf", [addr.PrizePool]);
  await send(opsWallet, addr.VoyageGame, abis.VoyageGame, "poke");
  const poolAfterRelease = await read(addr.ClamToken, abis.ClamToken, "balanceOf", [addr.PrizePool]);
  const released = poolBefore - poolAfterRelease;
  const cap = (poolBefore * 150n) / BPS;
  if (released > cap) invariantFailures.push(`day ${day}: release ${released} > cap ${cap}`);
  const tranche = await read(addr.VoyageGame, abis.VoyageGame, "trancheOf", [BigInt(day)]);

  // Three 8-hour legs; each party sails as many legs as its archetype's energy plan.
  const legsPlanned = players.map((p) => p.partyIds.map(() => voyagesToday(p.archetype, rng)));
  const started = [];
  for (let leg = 0; leg < 3; leg++) {
    // Settle the previous leg's voyages first (their 8h are up after the warp below).
    const startedThisLeg = [];
    for (let pi = 0; pi < players.length; pi++) {
      const p = players[pi];
      for (let partyIdx = 0; partyIdx < p.partyIds.length; partyIdx++) {
        if (legsPlanned[pi][partyIdx] <= leg) continue;
        const party = p.partyIds[partyIdx];
        const receipt = await send(p.wallet, addr.VoyageGame, abis.VoyageGame, "startVoyage",
          [party, pickTicker(p, party)]);
        startedThisLeg.push({voyageId: voyageIdFromReceipt(receipt), player: p});
      }
    }
    started.push(...startedThisLeg);
    await testClient.increaseTime({seconds: DAY / 3});
    await testClient.mine({blocks: 1});
    await pushLegPrices(day);
    for (const v of startedThisLeg) {
      await send(opsWallet, addr.VoyageGame, abis.VoyageGame, "settle", [v.voyageId]);
    }
  }
  voyagesByDay.set(day, started);

  // Claims for day-2 voyages (weights final), then archetype-driven redemptions.
  const claimable = voyagesByDay.get(day - 2) ?? [];
  const earnedToday = new Map();
  for (const v of claimable) {
    const receipt = await send(v.player.wallet, addr.VoyageGame, abis.VoyageGame, "claim", [v.voyageId]);
    const payout = payoutFromReceipt(receipt);
    v.player.claimedTotal += payout;
    earnedToday.set(v.player, (earnedToday.get(v.player) ?? 0n) + payout);
  }
  voyagesByDay.delete(day - 2);
  for (const [p, earned] of earnedToday) {
    const share = REDEEM_PROPENSITY[p.archetype];
    if (share === 0) continue;
    const toRedeem = (earned * BigInt(Math.round(share * 10_000))) / BPS;
    const balance = await read(addr.ClamToken, abis.ClamToken, "balanceOf", [p.account.address]);
    const amount = toRedeem < balance ? toRedeem : balance;
    if (amount > 0n) {
      await send(p.wallet, addr.ClamVault, abis.ClamVault, "redeem", [amount]);
      p.redeemedUsdg += amount - (amount * 100n + BPS - 1n) / BPS;
    }
  }

  // Housekeeping: sweep expired days, flush the fee router into pool + treasury.
  if (day >= 10) {
    const swept = await read(addr.VoyageGame, abis.VoyageGame, "sweptOf", [BigInt(day - 10)]);
    if (!swept) await send(opsWallet, addr.VoyageGame, abis.VoyageGame, "sweep", [BigInt(day - 10)]);
  }
  await send(opsWallet, addr.FeeRouter, abis.FeeRouter, "flush");

  // Invariants, every single day.
  const surplus = await read(addr.ClamVault, abis.ClamVault, "reserveSurplus");
  if (surplus !== 0n) invariantFailures.push(`day ${day}: vault reserve surplus ${surplus}`);
  const holders = [addr.PrizePool, addr.LeaderboardPot, addr.VoyageGame, addr.FeeRouter,
    deployer.address, ...players.map((p) => p.account.address)];
  let held = 0n;
  for (const h of holders) held += await read(addr.ClamToken, abis.ClamToken, "balanceOf", [h]);
  const supply = await read(addr.ClamToken, abis.ClamToken, "totalSupply");
  if (held !== supply) invariantFailures.push(`day ${day}: conservation broken held=${held} supply=${supply}`);

  const poolEnd = await read(addr.ClamToken, abis.ClamToken, "balanceOf", [addr.PrizePool]);
  metrics.push({
    day,
    regime: regimeForDay(day),
    poolStart: poolBefore.toString(),
    poolEnd: poolEnd.toString(),
    released: released.toString(),
    tranche: tranche.toString(),
    voyages: started.length,
    claimedToday: [...earnedToday.values()].reduce((s, v) => s + v, 0n).toString(),
  });
  if (day % 10 === 0) {
    console.log(`day ${day}: pool ${Number(poolEnd) / 1e6} CLAM, ${started.length} voyages, surplus ${surplus}`);
  }
  if (invariantFailures.length > 0) break;
}

// ---------- Final state + matching sim run ----------

const finalState = {
  pool: (await read(addr.ClamToken, abis.ClamToken, "balanceOf", [addr.PrizePool])).toString(),
  leaderboardPot: (await read(addr.ClamToken, abis.ClamToken, "balanceOf", [addr.LeaderboardPot])).toString(),
  treasury: (await read(addr.ClamToken, abis.ClamToken, "balanceOf", [deployer.address])).toString(),
  clamSupply: (await read(addr.ClamToken, abis.ClamToken, "totalSupply")).toString(),
  doubloonsEarned: (await read(addr.Doubloons, abis.Doubloons, "totalEarned")).toString(),
  players: players.map((p) => ({
    archetype: p.archetype,
    creatures: p.creatures,
    claimed: p.claimedTotal.toString(),
    spentUsdg: p.spentUsdg.toString(),
    redeemedUsdg: p.redeemedUsdg.toString(),
  })),
};

console.log("running the matching sim scenario for the diff...");
const simResult = runScenario({
  name: "anvil-mirror",
  seed: SEED,
  days: DAYS,
  regimeForDay,
  joins: (day) =>
    day === 0
      ? archetypePlan().map((p) => ({archetype: p.archetype, creaturesWanted: p.creatures}))
      : [],
  leaveFraction: () => 0,
});
const simMetrics = simResult.metrics.map((m) => ({day: m.day, pool: m.poolEnd.toString()}));

writeFileSync(join(SCRATCH_ASSETS, "anvil-replay.json"), JSON.stringify({
  days: DAYS, seed: SEED, totalCreatures, metrics, finalState, simMetrics, invariantFailures,
}, null, 2));

if (invariantFailures.length > 0) {
  console.error("INVARIANT FAILURES:\n" + invariantFailures.join("\n"));
  process.exit(1);
}

// Diff: pool trajectory on-chain vs sim, tolerance for the claim-lag structural difference.
let worstDrift = 0;
for (const m of metrics) {
  const sim = simResult.metrics[m.day];
  const chainPool = Number(m.poolEnd);
  const simPool = Number(sim.poolEnd);
  if (simPool > 0) worstDrift = Math.max(worstDrift, Math.abs(chainPool - simPool) / simPool);
}
console.log(`replay complete: ${DAYS} days, all invariants held.`);
console.log(`worst pool drift vs simulator: ${(worstDrift * 100).toFixed(2)}%`);
console.log(`assets written to ${join(SCRATCH_ASSETS, "anvil-replay.json")}`);
process.exit(0);
