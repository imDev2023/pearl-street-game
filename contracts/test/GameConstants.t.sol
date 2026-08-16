// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameConstants as C} from "../src/GameConstants.sol";

/// Every economic constant lives in one place (GameConstants) with a test asserting its
/// documented value (repo convention). docs/ECONOMY.md is the source of truth; the
/// TypeScript simulator's docsync test parses that document, and packages/sim constants
/// mirror these exactly, so a drift in any of the three surfaces fails a suite.
contract GameConstantsTest is Test {
    function test_gen0SaleConstants() public pure {
        assertEq(C.GEN0_SUPPLY, 7_500);
        assertEq(C.GEN0_PRICE_PUBLIC, 100 * 1e6);
        assertEq(C.GEN0_PRICE_ALLOWLIST, 80 * 1e6);
        assertEq(C.GEN0_PER_WALLET_CAP, 15);
        assertEq(C.SALE_TO_POOL_BPS, 3_000);
        assertEq(C.SALE_TO_OPS_BPS, 7_000);
        assertEq(C.SALE_TO_POOL_BPS + C.SALE_TO_OPS_BPS, C.BPS);
    }

    function test_playLoopConstants() public pure {
        assertEq(C.ENERGY_PER_DAY, 24);
        assertEq(C.VOYAGE_ENERGY_COST, 8);
        assertEq(uint256(C.ENERGY_PER_DAY) / C.VOYAGE_ENERGY_COST, 3); // 3 voyages per day
        assertEq(C.MAX_PARTY_SIZE, 3);
        assertEq(C.MODIFIER_MIN_BPS, 7_000);
        assertEq(C.MODIFIER_MAX_BPS, 13_000);
        assertEq(C.AFFINITY_BONUS_BPS, 1_000);
        assertEq(C.DOUBLOONS_PER_VOYAGE, 10);
    }

    function test_poolAndFeeConstants() public pure {
        assertEq(C.DAILY_RELEASE_BPS, 150);
        assertEq(C.RELEASE_TO_HAULS_BPS, 8_000);
        assertEq(C.RELEASE_TO_LEADERBOARD_BPS, 2_000);
        assertEq(C.RELEASE_TO_HAULS_BPS + C.RELEASE_TO_LEADERBOARD_BPS, C.BPS);
        assertEq(C.VAULT_MINT_FEE_BPS, 200);
        assertEq(C.VAULT_REDEEM_FEE_BPS, 500);
        assertEq(C.FEES_TO_POOL_BPS, 10_000);
    }
}
