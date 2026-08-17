// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {EconomyBase} from "./EconomyBase.t.sol";
import {GameConstants as C} from "../src/GameConstants.sol";

contract ClamVaultTest is EconomyBase {
    address internal alice = makeAddr("alice");

    function test_depositExactFeeMath() public {
        usdg.mintTo(alice, 100e6);
        vm.startPrank(alice);
        usdg.approve(address(vault), 100e6);
        uint256 out = vault.deposit(100e6);
        vm.stopPrank();
        assertEq(out, 98e6, "2% mint fee skimmed");
        assertEq(clam.balanceOf(alice), 98e6);
        assertEq(clam.balanceOf(address(router)), 2e6, "fee CLAM at the router");
        assertEq(clam.totalSupply(), 100e6, "supply == deposit");
        assertEq(usdg.balanceOf(address(vault)), 100e6, "reserve == deposit");
        assertEq(vault.reserveSurplus(), 0);
    }

    function test_redeemExactFeeMath() public {
        usdg.mintTo(alice, 100e6);
        vm.startPrank(alice);
        usdg.approve(address(vault), 100e6);
        vault.deposit(100e6);
        uint256 out = vault.redeem(98e6);
        vm.stopPrank();
        // Fee = ceil(5% of 98 CLAM) = 4.9 CLAM; alice receives 93.1 USDG.
        assertEq(out, 98e6 - 4_900_000);
        assertEq(usdg.balanceOf(alice), 98e6 - 4_900_000);
        assertEq(vault.reserveSurplus(), 0);
    }

    function test_roundingFavorsProtocol() public {
        usdg.mintTo(alice, 3);
        vm.startPrank(alice);
        usdg.approve(address(vault), 3);
        uint256 out = vault.deposit(3); // fee = ceil(0.06) = 1
        vm.stopPrank();
        assertEq(out, 2);
        assertEq(clam.balanceOf(address(router)), 1);
        assertEq(vault.reserveSurplus(), 0);
    }

    function test_redemptionAlwaysAvailable_noPauseNoOwnerNoWithdraw() public {
        // Structural: the vault has no owner, no pause, and no USDG outflow but redeem.
        // Here we assert the mass-exit case: every holder can always exit in full.
        address bob = makeAddr("bob");
        usdg.mintTo(alice, 1_000_000e6);
        usdg.mintTo(bob, 500_000e6);
        vm.startPrank(alice);
        usdg.approve(address(vault), type(uint256).max);
        vault.deposit(1_000_000e6);
        vm.stopPrank();
        vm.startPrank(bob);
        usdg.approve(address(vault), type(uint256).max);
        vault.deposit(500_000e6);
        vm.stopPrank();

        uint256 aliceClam = clam.balanceOf(alice);
        uint256 bobClam = clam.balanceOf(bob);
        vm.prank(alice);
        vault.redeem(aliceClam);
        vm.prank(bob);
        vault.redeem(bobClam);
        assertEq(vault.reserveSurplus(), 0, "reserve == supply after full exit");
    }

    function testFuzz_reserveAlwaysEqualsSupply(uint96 a, uint96 b, uint96 redeemA) public {
        uint256 depositA = uint256(a) % 1_000_000e6 + 1;
        uint256 depositB = uint256(b) % 1_000_000e6 + 1;
        usdg.mintTo(alice, depositA + depositB);
        vm.startPrank(alice);
        usdg.approve(address(vault), type(uint256).max);
        vault.deposit(depositA);
        vault.deposit(depositB);
        uint256 bal = clam.balanceOf(alice);
        // Tiny deposits (1-2 units) are all fee, so alice may hold nothing; the invariant still holds.
        if (bal > 0) {
            uint256 toRedeem = uint256(redeemA) % bal + 1;
            vault.redeem(toRedeem);
        }
        vm.stopPrank();
        assertEq(vault.reserveSurplus(), 0);
    }

    function test_feeRouterSendsAllFeesToPool() public {
        usdg.mintTo(alice, 100e6);
        vm.startPrank(alice);
        usdg.approve(address(vault), 100e6);
        vault.deposit(100e6); // 2 CLAM fee at the router
        vm.stopPrank();
        (uint256 toPool, uint256 toTreasury) = router.flush();
        assertEq(toPool, 2_000_000);
        assertEq(toTreasury, 0);
        assertEq(clam.balanceOf(address(pool)), 2_000_000);
        assertEq(clam.balanceOf(treasury), 0);
    }
}
