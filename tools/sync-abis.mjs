// Copies the ABIs of the shipped contracts from contracts/out into packages/sdk/src/abis.ts.
// Run after `forge build`. Keeps the SDK's ABIs identical to the compiled artifacts.
import {readFileSync, writeFileSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const names = ["ClamVault", "ClamToken", "FeeRouter", "MockUSDG"];
let ts = "// Generated from contracts/out by tools/sync-abis.mjs after `forge build`; do not edit.\n// Regenerate: `npm run sync-abis` at the repo root.\n";
for (const n of names) {
  const art = JSON.parse(readFileSync(join(root, "contracts", "out", `${n}.sol`, `${n}.json`), "utf8"));
  ts += `export const ${n}Abi = ${JSON.stringify(art.abi, null, 2)} as const;\n\n`;
}
writeFileSync(join(root, "packages", "sdk", "src", "abis.ts"), ts);
console.log(`synced ${names.length} ABIs`);
