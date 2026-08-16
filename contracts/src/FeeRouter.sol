// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {GameConstants as C} from "./GameConstants.sol";
import {IERC20Minimal} from "./ClamVault.sol";

/// Single sink for all protocol fee revenue (in CLAM). Anyone may flush;
/// the split is fixed by GameConstants (100% to the active season prize pool since 2026-08-16;
/// the treasury leg exists so the split is a single doc-asserted constant, not a code change).
/// Addresses are immutable so no admin can redirect fee flow after deployment.
contract FeeRouter {
    IERC20Minimal public immutable clam;
    address public immutable prizePool;
    address public immutable treasury;

    event Flushed(uint256 toPool, uint256 toTreasury);

    constructor(IERC20Minimal clam_, address prizePool_, address treasury_) {
        require(prizePool_ != address(0) && treasury_ != address(0), "zero address");
        clam = clam_;
        prizePool = prizePool_;
        treasury = treasury_;
    }

    function flush() external returns (uint256 toPool, uint256 toTreasury) {
        uint256 bal = clam.balanceOf(address(this));
        toPool = (bal * C.FEES_TO_POOL_BPS) / C.BPS;
        toTreasury = bal - toPool;
        if (toPool > 0) require(clam.transfer(prizePool, toPool), "pool transfer");
        if (toTreasury > 0) require(clam.transfer(treasury, toTreasury), "treasury transfer");
        emit Flushed(toPool, toTreasury);
    }
}
