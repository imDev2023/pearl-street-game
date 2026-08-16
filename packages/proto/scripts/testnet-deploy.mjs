// Deploys the economy prototype to Robinhood testnet 46630 with 10-minute game days,
// generates 24 bot wallets (keys saved only to gitignored .env.bots), and funds them
// with gas from the main wallet. Writes the deployment record for the bots + dashboard.

import {execFileSync} from "node:child_process";
import {existsSync, mkdirSync, writeFileSync} from "node:fs";
import {join} from "node:path";
import {parseEther} from "viem";
import {generatePrivateKey, privateKeyToAccount} from "viem/accounts";
import {CONTRACTS_DIR, REPO_ROOT, SCRATCH_ASSETS, addressesFromBroadcast} from "../lib/common.mjs";
import {loadEnvKeys, makeClients, publicClient, robinhoodTestnet} from "../lib/testnet.mjs";

const DAY_LENGTH = 600; // 1 game day = 10 minutes
const STALE_AFTER = 1800;
const NUM_BOTS = 24;
const BOT_GAS = parseEther("0.02");
const BOTS_PATH = join(REPO_ROOT, "packages", "proto", ".env.bots");

const keys = loadEnvKeys();
const main = makeClients(keys.MAIN_WALLET_PRIVATE_KEY);
console.log("deployer (main wallet):", main.account.address);
const balance = await publicClient.getBalance({address: main.account.address});
console.log("balance:", Number(balance) / 1e18, "ETH");

console.log("deploying with DAY_LENGTH=600...");
const foundryBin = join(process.env.HOME, ".foundry", "bin");
execFileSync(join(foundryBin, "forge"), [
  "script", "script/DeployPrototype.s.sol",
  "--rpc-url", robinhoodTestnet.rpcUrls.default.http[0],
  "--broadcast", "--private-key", keys.MAIN_WALLET_PRIVATE_KEY,
], {
  cwd: CONTRACTS_DIR,
  env: {...process.env, DAY_LENGTH: String(DAY_LENGTH), STALE_AFTER: String(STALE_AFTER)},
  stdio: ["ignore", "ignore", "inherit"], // stdout may echo env; keys stay off the console
});
const addr = addressesFromBroadcast(46_630);
console.log("deployed", Object.keys(addr).length - 1, "contracts +", addr.feeds.length, "feeds");

// Bot wallets: generate once, reuse on re-runs.
let botKeys = [];
if (existsSync(BOTS_PATH)) {
  const {loadBotKeys} = await import("../lib/testnet.mjs");
  botKeys = loadBotKeys();
  console.log(`reusing ${botKeys.length} existing bot wallets from .env.bots`);
} else {
  botKeys = Array.from({length: NUM_BOTS}, () => generatePrivateKey());
  writeFileSync(BOTS_PATH, botKeys.map((k, i) => `BOT_${i + 1}=${k}`).join("\n") + "\n", {mode: 0o600});
  console.log(`generated ${NUM_BOTS} bot wallets into .env.bots (gitignored, mode 600)`);
}

console.log("funding bots with gas...");
for (const key of botKeys) {
  const bot = privateKeyToAccount(key);
  const existing = await publicClient.getBalance({address: bot.address});
  if (existing >= BOT_GAS / 2n) continue;
  const hash = await main.wallet.sendTransaction({to: bot.address, value: BOT_GAS});
  await publicClient.waitForTransactionReceipt({hash, timeout: 90_000});
}
console.log("bots funded.");

const genesis = Number(await publicClient.readContract({
  address: addr.VoyageGame,
  abi: [{type: "function", name: "genesis", inputs: [], outputs: [{type: "uint256"}], stateMutability: "view"}],
  functionName: "genesis",
}));

mkdirSync(SCRATCH_ASSETS, {recursive: true});
writeFileSync(join(SCRATCH_ASSETS, "testnet-deployment.json"), JSON.stringify({
  chainId: 46_630,
  treasury: main.account.address,
  dayLength: DAY_LENGTH,
  staleAfter: STALE_AFTER,
  genesis,
  deployedAt: new Date().toISOString(),
  addresses: addr,
}, null, 2));
console.log("deployment record written to .scratch/economy-prototype/assets/testnet-deployment.json");
