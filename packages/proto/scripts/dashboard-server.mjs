// Local live dashboard for the testnet economy run. Serves the page and a JSON API
// that combines chain reads (via the public testnet RPC) with the bot fleet's state
// file. Local tool only - runs on 127.0.0.1, no external exposure.
//
// Usage: node scripts/dashboard-server.mjs   then open http://127.0.0.1:4173

import {createServer} from "node:http";
import {existsSync, readFileSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {loadAbis, SCRATCH_ASSETS} from "../lib/common.mjs";
import {publicClient} from "../lib/testnet.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PAGE = join(here, "..", "dashboard", "index.html");
const PORT = 4173;
const abis = loadAbis();

function loadJson(name) {
  const path = join(SCRATCH_ASSETS, name);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

async function apiState() {
  const deployment = loadJson("testnet-deployment.json");
  if (!deployment) return {error: "no testnet deployment yet - run testnet:deploy"};
  const addr = deployment.addresses;
  const read = (address, abi, functionName, args = []) =>
    publicClient.readContract({address, abi, functionName, args});

  const [pool, lbPot, treasury, supply, surplus, day, voyages, doubloons] = await Promise.all([
    read(addr.ClamToken, abis.ClamToken, "balanceOf", [addr.PrizePool]),
    read(addr.ClamToken, abis.ClamToken, "balanceOf", [addr.LeaderboardPot]),
    read(addr.ClamToken, abis.ClamToken, "balanceOf", [deployment.treasury]),
    read(addr.ClamToken, abis.ClamToken, "totalSupply"),
    read(addr.ClamVault, abis.ClamVault, "reserveSurplus"),
    read(addr.VoyageGame, abis.VoyageGame, "currentDay"),
    read(addr.VoyageGame, abis.VoyageGame, "voyageCount"),
    read(addr.Doubloons, abis.Doubloons, "totalEarned"),
  ]);
  const tranche = await read(addr.VoyageGame, abis.VoyageGame, "trancheOf", [day]);
  const state = loadJson("testnet-state.json") ?? {};
  return {
    now: Date.now(),
    deployment: {chainId: deployment.chainId, dayLength: deployment.dayLength, genesis: deployment.genesis},
    chain: {
      day: Number(day),
      pool: pool.toString(),
      leaderboardPot: lbPot.toString(),
      treasury: treasury.toString(),
      clamSupply: supply.toString(),
      reserveSurplus: surplus.toString(),
      voyages: Number(voyages),
      trancheToday: tranche.toString(),
      doubloonsEarned: doubloons.toString(),
    },
    fleet: {day: state.day, players: state.players ?? [], poolHistory: state.poolHistory ?? []},
  };
}

createServer(async (req, res) => {
  try {
    if (req.url === "/api/state") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(await apiState(), null, 2));
    } else if (req.url === "/api/replay") {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(loadJson("anvil-replay.json")));
    } else {
      res.setHeader("content-type", "text/html");
      res.end(readFileSync(PAGE));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({error: String(error?.message ?? error)}));
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Pearl Street economy dashboard: http://127.0.0.1:${PORT}`);
});
