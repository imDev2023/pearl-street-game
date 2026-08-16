// Economic constants for the Pearl Street simulator.
// docs/ECONOMY.md is the single source of truth; test/docsync.test.mjs parses that
// document and fails if any value here drifts from the documented one.
// All CLAM amounts are integer micro-CLAM (6 decimals, matching USDG) as bigint.

/** One CLAM in micro-CLAM units (6 decimals, 1:1 with USDG's 6 decimals). */
export const CLAM = 1_000_000n;

/** Basis-point denominator used for every percentage constant below. */
export const BPS = 10_000n;

// Gen-0 sale.
export const GEN0_SUPPLY = 7_500;
export const GEN0_PRICE_PUBLIC = 100n * CLAM;
export const GEN0_PRICE_ALLOWLIST = 80n * CLAM;
export const GEN0_PER_WALLET_CAP = 15;
/** 30% of Gen-0 proceeds seed the Season One prize pool. */
export const SALE_TO_POOL_BPS = 3_000n;
/** 70% of Gen-0 proceeds go to the operations multisig. */
export const SALE_TO_OPS_BPS = 7_000n;

// The play loop.
export const PARTY_SIZE = 3;
export const ENERGY_PER_DAY = 24;
export const VOYAGE_ENERGY_COST = 8;
export const VOYAGE_DURATION_HOURS = 8;
export const MAX_VOYAGES_PER_DAY = ENERGY_PER_DAY / VOYAGE_ENERGY_COST;
/** Market modifier hard floor: 0.7x expressed in bps of the base haul. */
export const MODIFIER_MIN_BPS = 7_000n;
/** Market modifier hard cap: 1.3x expressed in bps of the base haul. */
export const MODIFIER_MAX_BPS = 13_000n;
/** Affinity bonus: +10% when the party sector matches the ticker. */
export const AFFINITY_BONUS_BPS = 1_000n;
export const DOUBLOONS_PER_VOYAGE = 10;

// The prize pool.
/** The pool releases at most 1.5% of its current balance per day. */
export const DAILY_RELEASE_BPS = 150n;
/** 80% of the daily release funds voyage hauls. */
export const RELEASE_TO_HAULS_BPS = 8_000n;
/** 20% of the daily release accrues to the season-end leaderboard pot. */
export const RELEASE_TO_LEADERBOARD_BPS = 2_000n;

// Revenue routing.
/** CLAM vault fees, taken at the edges only. */
export const VAULT_MINT_FEE_BPS = 200n;
export const VAULT_REDEEM_FEE_BPS = 500n;
/** 100% of all protocol fee revenue flows into the active season prize pool (2026-08-16). */
export const FEES_TO_POOL_BPS = 10_000n;

// Supply control.
export const GEN1_CAP_PER_SEASON = 5_000;
export const BREED_LIFETIME_LIMIT = 5;

// Simulator-only assumptions (NOT documented constants; flagged in the stress report).
// Season length is not fixed anywhere in docs/ECONOMY.md; 90 days is the working assumption.
export const SEASON_DAYS = 90;
/** Fraction of players (by season Doubloons rank) sharing the leaderboard pot. */
export const LEADERBOARD_WINNER_FRACTION = 0.2;
/** Amplification from an 8h feed delta to the modifier, before the 0.7x-1.3x hard caps. */
export const MODIFIER_AMPLIFICATION = 10;
