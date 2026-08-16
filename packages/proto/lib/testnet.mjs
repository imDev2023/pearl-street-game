// Testnet plumbing: key loading (keys are never printed or logged), clients with
// drop-tolerant sends (Robinhood sequencer screening can silently drop transactions,
// so every send times out and retries), and the deployment record.

import {readFileSync} from "node:fs";
import {join} from "node:path";
import {createPublicClient, createWalletClient, defineChain, http} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {REPO_ROOT} from "./common.mjs";

export const robinhoodTestnet = defineChain({
  id: 46_630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: {name: "Ether", symbol: "ETH", decimals: 18},
  rpcUrls: {default: {http: ["https://rpc.testnet.chain.robinhood.com"]}},
});

const ENV_PATH = join(REPO_ROOT, "..", ".env");
const BOTS_PATH = join(REPO_ROOT, "packages", "proto", ".env.bots");

/** Private keys from Crabada/.env by variable name. Returned, never displayed. */
export function loadEnvKeys() {
  const text = readFileSync(ENV_PATH, "utf8");
  const keys = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_0-9]+)\s*=\s*"?(0x)?([0-9a-fA-F]{64})"?\s*$/);
    if (m) keys[m[1]] = "0x" + m[3];
  }
  return keys;
}

export function loadBotKeys() {
  const text = readFileSync(BOTS_PATH, "utf8");
  return text.split("\n").filter((l) => l.startsWith("BOT_")).map((l) => l.split("=")[1].trim());
}

export function makeClients(privateKey) {
  const account = privateKeyToAccount(privateKey);
  return {
    account,
    wallet: createWalletClient({account, chain: robinhoodTestnet, transport: http()}),
  };
}

export const publicClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(),
  pollingInterval: 1000,
});

/** Send with timeout + retry: never assume inclusion (sequencer screening drops silently). */
export async function sendRobust(wallet, params, {retries = 3, timeoutMs = 90_000} = {}) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const hash = await wallet.writeContract(params);
      return await publicClient.waitForTransactionReceipt({hash, timeout: timeoutMs});
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)));
    }
  }
  throw new Error(`tx failed after ${retries} attempts (${params.functionName}): ${lastError?.shortMessage ?? lastError}`);
}
