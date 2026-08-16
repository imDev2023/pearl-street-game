/** Formatting helpers for 6-decimal amounts (USDG and CLAM share the unit). */
export const UNIT = 1_000_000n;

export function formatUnits6(value: bigint, maxFraction = 2): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / UNIT;
  const frac = abs % UNIT;
  const wholeStr = whole.toLocaleString("en-US");
  if (maxFraction === 0) return (negative ? "-" : "") + wholeStr;
  const fracStr = frac.toString().padStart(6, "0").slice(0, maxFraction).replace(/0+$/, "");
  return (negative ? "-" : "") + wholeStr + (fracStr ? "." + fracStr : "");
}

/** Parse a decimal string typed by a user into 6-decimal units; null if invalid. */
export function parseUnits6(input: string): bigint | null {
  const trimmed = input.trim();
  if (!/^\d*(\.\d{0,6})?$/.test(trimmed) || trimmed === "" || trimmed === ".") return null;
  const [whole = "0", frac = ""] = trimmed.split(".");
  return BigInt(whole || "0") * UNIT + BigInt((frac + "000000").slice(0, 6));
}

/** Fee previews mirror ClamVault._ceilBps: fees round up, in the protocol's favor. */
export function ceilBps(amount: bigint, bps: bigint): bigint {
  return (amount * bps + 9_999n) / 10_000n;
}
