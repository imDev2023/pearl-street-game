// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {GameConstants as C} from "./GameConstants.sol";
import {IERC20Minimal} from "./ClamVault.sol";

/// The season prize pool. Structurally insolvency-proof: the only outflow is release(),
/// which pays at most 1.5% of the CURRENT balance, at most once per game day, split
/// 80% to the voyage game and 20% to the leaderboard pot. No admin, no other outflow.
/// The game-day clock is timestamp-based (never block.number - Arbitrum Nitro).
contract PrizePool {
    IERC20Minimal public immutable clam;
    address public immutable game;
    address public immutable leaderboardPot;
    uint256 public immutable genesis;
    uint256 public immutable dayLength;

    uint256 public lastReleasedDay = type(uint256).max;

    event Released(uint256 indexed day, uint256 toHauls, uint256 toLeaderboard);

    constructor(
        IERC20Minimal clam_,
        address game_,
        address leaderboardPot_,
        uint256 genesis_,
        uint256 dayLength_
    ) {
        require(game_ != address(0) && leaderboardPot_ != address(0), "zero address");
        require(dayLength_ > 0, "zero day");
        clam = clam_;
        game = game_;
        leaderboardPot = leaderboardPot_;
        genesis = genesis_;
        dayLength = dayLength_;
    }

    function currentDay() public view returns (uint256) {
        return (block.timestamp - genesis) / dayLength;
    }

    /// Called by the game once per day. The pool computes the amount itself; the caller
    /// cannot influence it. Returns the haul tranche transferred to the game.
    function release() external returns (uint256 toHauls) {
        require(msg.sender == game, "game only");
        uint256 day = currentDay();
        require(lastReleasedDay == type(uint256).max || day > lastReleasedDay, "already released today");
        lastReleasedDay = day;

        uint256 total = (clam.balanceOf(address(this)) * C.DAILY_RELEASE_BPS) / C.BPS;
        toHauls = (total * C.RELEASE_TO_HAULS_BPS) / C.BPS;
        uint256 toLeaderboard = total - toHauls;
        if (toHauls > 0) require(clam.transfer(game, toHauls), "haul transfer");
        if (toLeaderboard > 0) require(clam.transfer(leaderboardPot, toLeaderboard), "pot transfer");
        emit Released(day, toHauls, toLeaderboard);
    }
}
