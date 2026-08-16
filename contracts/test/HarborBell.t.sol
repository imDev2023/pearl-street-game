// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {HarborBell} from "../src/HarborBell.sol";

contract HarborBellTest is Test {
    HarborBell internal bell;

    event Rung(address indexed by, uint256 count, string note);

    function setUp() public {
        bell = new HarborBell();
    }

    function test_StartsSilent() public view {
        assertEq(bell.ringCount(), 0);
    }

    function test_RingIncrementsAndEmits() public {
        vm.expectEmit(true, false, false, true);
        emit Rung(address(this), 1, "first bell");
        bell.ring("first bell");
        assertEq(bell.ringCount(), 1);
    }

    function testFuzz_RingCountsEveryRing(uint8 rings) public {
        for (uint256 i = 0; i < rings; i++) {
            bell.ring("");
        }
        assertEq(bell.ringCount(), rings);
    }
}
