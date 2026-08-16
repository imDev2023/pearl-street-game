// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {EconomyBase} from "./EconomyBase.t.sol";
import {GameConstants as C} from "../src/GameConstants.sol";

contract PrizePoolTest is EconomyBase {
    function _seedPool(uint256 amount) internal {
        // Seed via a real economic path: a sale purchase routes 30% here. For an exact
        // amount, deposit into the vault as the pool's "donor" and transfer.
        address donor = makeAddr("donor");
        uint256 gross = (amount * C.BPS) / (C.BPS - C.VAULT_MINT_FEE_BPS) + 1;
        usdg.mintTo(donor, gross);
        vm.startPrank(donor);
        usdg.approve(address(vault), gross);
        vault.deposit(gross);
        clam.transfer(address(pool), amount);
        vm.stopPrank();
    }

    function test_releaseIsExactlyCappedAndSplit() public {
        _seedPool(1_000_000e6);
        vm.prank(address(game));
        uint256 toHauls = pool.release();
        uint256 total = (1_000_000e6 * C.DAILY_RELEASE_BPS) / C.BPS; // 15,000 CLAM
        assertEq(toHauls, (total * C.RELEASE_TO_HAULS_BPS) / C.BPS, "80% to hauls");
        assertEq(clam.balanceOf(address(game)), toHauls);
        assertEq(clam.balanceOf(address(lbPot)), total - toHauls, "20% to the pot");
    }

    function test_onlyOncePerDay() public {
        _seedPool(1_000e6);
        vm.startPrank(address(game));
        pool.release();
        vm.expectRevert(bytes("already released today"));
        pool.release();
        vm.warp(block.timestamp + DAY);
        pool.release(); // next day is fine
        vm.stopPrank();
    }

    function test_onlyGameCanRelease() public {
        _seedPool(1_000e6);
        vm.expectRevert(bytes("game only"));
        pool.release();
    }

    function test_emptyPoolReleasesZeroWithoutBreaking() public {
        vm.prank(address(game));
        uint256 toHauls = pool.release();
        assertEq(toHauls, 0);
    }
}
