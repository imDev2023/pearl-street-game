// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// Economic constants for Pearl Street. docs/ECONOMY.md is the single source of truth;
/// test/GameConstants.t.sol asserts every value here against the documented one, and the
/// TypeScript simulator (packages/sim) doc-syncs against the same document.
/// All CLAM/USDG amounts are 6-decimal integers.
library GameConstants {
    uint256 internal constant BPS = 10_000;
    uint256 internal constant ONE_CLAM = 1e6;

    // Gen-0 sale.
    uint256 internal constant GEN0_SUPPLY = 7_500;
    uint256 internal constant GEN0_PRICE_PUBLIC = 100 * ONE_CLAM;
    uint256 internal constant GEN0_PRICE_ALLOWLIST = 80 * ONE_CLAM;
    uint256 internal constant GEN0_PER_WALLET_CAP = 15;
    uint256 internal constant SALE_TO_POOL_BPS = 3_000; // 30% seeds the season pool
    uint256 internal constant SALE_TO_OPS_BPS = 7_000; // 70% to operations

    // Play loop.
    uint8 internal constant ENERGY_PER_DAY = 24;
    uint8 internal constant VOYAGE_ENERGY_COST = 8;
    uint256 internal constant MAX_PARTY_SIZE = 3;
    uint256 internal constant MODIFIER_MIN_BPS = 7_000; // 0.7x hard floor
    uint256 internal constant MODIFIER_MAX_BPS = 13_000; // 1.3x hard cap
    uint256 internal constant AFFINITY_BONUS_BPS = 1_000; // +10% sector match
    uint256 internal constant DOUBLOONS_PER_VOYAGE = 10;
    /// Amplification from the voyage feed delta to the modifier, before hard caps.
    /// Simulator assumption mirrored on-chain; not yet a documented constant.
    uint256 internal constant MODIFIER_AMPLIFICATION = 10;

    // Prize pool.
    uint256 internal constant DAILY_RELEASE_BPS = 150; // at most 1.5% of balance per day
    uint256 internal constant RELEASE_TO_HAULS_BPS = 8_000; // 80% voyage hauls
    uint256 internal constant RELEASE_TO_LEADERBOARD_BPS = 2_000; // 20% leaderboard pot

    // Vault fees (skimmed at the edges only).
    uint256 internal constant VAULT_MINT_FEE_BPS = 200; // 2%
    uint256 internal constant VAULT_REDEEM_FEE_BPS = 500; // 5%
    uint256 internal constant FEES_TO_POOL_BPS = 10_000; // 100% of fee revenue refills the pool (2026-08-16)
}
