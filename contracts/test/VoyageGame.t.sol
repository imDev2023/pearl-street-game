// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {EconomyBase} from "./EconomyBase.t.sol";
import {GameConstants as C} from "../src/GameConstants.sol";

contract VoyageGameTest is EconomyBase {
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function test_fullDayCycle_saleSeedsPoolAndVoyagePaysHaul() public {
        uint256 firstId = _buyCreatures(alice, 3);
        // Sale seed: 30% of 300 CLAM = 90 CLAM in the pool (plus nothing else yet).
        assertEq(clam.balanceOf(address(pool)), 90e6);

        // Alice sails a full party on ticker 0.
        vm.prank(alice);
        uint256 voyageId = game.startVoyage(_party(firstId, 3), 0);
        // poke() released day 0: 1.5% of 90 = 1.35 CLAM total, 80% = 1.08 to the game.
        assertEq(game.trancheOf(0), 1_080_000);
        assertEq(clam.balanceOf(address(lbPot)), 270_000, "20% to the pot");

        // +2% price over the voyage: modifier = 1 + 10 * 0.02 = 1.2x.
        vm.warp(block.timestamp + game.voyageDuration());
        feeds[0].setAnswer(102e8);
        game.settle(voyageId);

        // Weight = 3 * 12000 * affinity / 10000; doubloons = (10 + 5 bonus) * 3.
        assertEq(doubloons.balanceOf(alice), 45);

        // Claims open on day 2; the only voyage takes the whole tranche.
        vm.warp(block.timestamp + 2 * DAY);
        uint256 before = clam.balanceOf(alice);
        vm.prank(alice);
        uint256 payout = game.claim(voyageId);
        assertEq(payout, 1_080_000, "sole voyage claims the full tranche");
        assertEq(clam.balanceOf(alice) - before, payout);
    }

    function test_modifierHardCapsBothWays() public {
        uint256 firstId = _buyCreatures(alice, 2);
        vm.startPrank(alice);
        uint256 upId = game.startVoyage(_party(firstId, 1), 1);
        uint256 downId = game.startVoyage(_party(firstId + 1, 1), 2);
        vm.stopPrank();
        vm.warp(block.timestamp + game.voyageDuration());
        feeds[1].setAnswer(200e8); // +100%: raw 11x, capped at 1.3x
        feeds[2].setAnswer(50e8); // -50%: raw -4x, floored at 0.7x
        game.settle(upId);
        game.settle(downId);
        (,,,,,, bool sm1,,, uint96 w1) = game.voyages(upId);
        (,,,,,, bool sm2,,, uint96 w2) = game.voyages(downId);
        assertEq(uint256(w1), (C.MODIFIER_MAX_BPS * (sm1 ? C.BPS + C.AFFINITY_BONUS_BPS : C.BPS)) / C.BPS);
        assertEq(uint256(w2), (C.MODIFIER_MIN_BPS * (sm2 ? C.BPS + C.AFFINITY_BONUS_BPS : C.BPS)) / C.BPS);
    }

    function test_staleFeedVoidsModifierAndPaysBase() public {
        uint256 firstId = _buyCreatures(alice, 1);
        // No price pushes for longer than staleAfter: the weekend-freeze case.
        vm.warp(block.timestamp + STALE_AFTER + 1);
        vm.prank(alice);
        uint256 voyageId = game.startVoyage(_party(firstId, 1), 0);
        vm.warp(block.timestamp + game.voyageDuration());
        game.settle(voyageId); // must not revert
        (,,,,,, bool sectorMatch,,, uint96 weight) = game.voyages(voyageId);
        assertEq(uint256(weight), (C.BPS * (sectorMatch ? C.BPS + C.AFFINITY_BONUS_BPS : C.BPS)) / C.BPS);
    }

    function test_energyCapsThreeVoyagesPerCreaturePerDay() public {
        uint256 firstId = _buyCreatures(alice, 1);
        vm.startPrank(alice);
        game.startVoyage(_party(firstId, 1), 0);
        game.startVoyage(_party(firstId, 1), 0);
        game.startVoyage(_party(firstId, 1), 0);
        vm.expectRevert(bytes("no energy"));
        game.startVoyage(_party(firstId, 1), 0);
        vm.stopPrank();
        // Energy refills at the next day tick.
        vm.warp(block.timestamp + DAY);
        vm.prank(alice);
        game.startVoyage(_party(firstId, 1), 0);
    }

    function test_partyRules() public {
        uint256 firstId = _buyCreatures(alice, 3);
        _buyCreatures(bob, 1);
        uint256[] memory dup = new uint256[](2);
        dup[0] = firstId;
        dup[1] = firstId;
        vm.prank(alice);
        vm.expectRevert(bytes("duplicate creature"));
        game.startVoyage(dup, 0);

        vm.prank(bob);
        vm.expectRevert(bytes("not yours"));
        game.startVoyage(_party(firstId, 1), 0);
    }

    function test_claimWindowAndDustSweep() public {
        uint256 firstId = _buyCreatures(alice, 3);
        vm.prank(alice);
        uint256 voyageId = game.startVoyage(_party(firstId, 3), 0);
        uint256 tranche = game.trancheOf(0);
        assertGt(tranche, 0);
        vm.warp(block.timestamp + game.voyageDuration());
        game.settle(voyageId);

        // Too early to claim.
        vm.prank(alice);
        vm.expectRevert(bytes("weights not final"));
        game.claim(voyageId);

        // Too late to claim: the whole tranche sweeps back to the pool.
        vm.warp(block.timestamp + 10 * DAY);
        vm.prank(alice);
        vm.expectRevert(bytes("claim window closed"));
        game.claim(voyageId);
        uint256 poolBefore = clam.balanceOf(address(pool));
        game.sweep(0);
        assertEq(clam.balanceOf(address(pool)) - poolBefore, tranche, "unclaimed haul returns to pool");
        assertEq(clam.balanceOf(address(game)), 0, "game holds nothing after sweep");
    }

    function test_settleWindowClosesSoWeightsGoFinal() public {
        uint256 firstId = _buyCreatures(alice, 1);
        vm.prank(alice);
        uint256 voyageId = game.startVoyage(_party(firstId, 1), 0);
        vm.warp(block.timestamp + 3 * DAY);
        vm.expectRevert(bytes("settle window closed"));
        game.settle(voyageId);
    }

    function test_twoVoyagesSplitTrancheByWeight() public {
        uint256 aliceId = _buyCreatures(alice, 1);
        uint256 bobId = _buyCreatures(bob, 1);
        vm.prank(alice);
        uint256 va = game.startVoyage(_party(aliceId, 1), 3);
        vm.prank(bob);
        uint256 vb = game.startVoyage(_party(bobId, 1), 4);
        uint256 tranche = game.trancheOf(0);

        vm.warp(block.timestamp + game.voyageDuration());
        feeds[3].setAnswer(103e8); // 1.3x cap for alice
        feeds[4].setAnswer(97e8); // 0.7x floor for bob
        game.settle(va);
        game.settle(vb);

        vm.warp(block.timestamp + 2 * DAY);
        vm.prank(alice);
        uint256 pa = game.claim(va);
        vm.prank(bob);
        uint256 pb = game.claim(vb);
        (,,,,,,,,, uint96 wa) = game.voyages(va);
        (,,,,,,,,, uint96 wb) = game.voyages(vb);
        assertEq(pa, (tranche * wa) / (uint256(wa) + wb));
        assertEq(pb, (tranche * wb) / (uint256(wa) + wb));
        assertLe(pa + pb, tranche, "never exceeds the tranche");
    }
}
