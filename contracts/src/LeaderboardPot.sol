// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20Minimal} from "./ClamVault.sol";

/// Season-end leaderboard pot. PROTOTYPE TRUST POINT: on-chain ranking is impractical,
/// so operations posts the season payout list computed off-chain from Doubloon standings.
/// Production replaces this with an indexer-computed merkle distribution (see the
/// economy-prototype map, "Not yet specified"). The pot can never pay more than it holds.
contract LeaderboardPot {
    IERC20Minimal public immutable clam;
    address public immutable ops;

    event SeasonSettled(uint256 indexed season, uint256 totalPaid, uint256 winners);

    constructor(IERC20Minimal clam_, address ops_) {
        require(ops_ != address(0), "zero ops");
        clam = clam_;
        ops = ops_;
    }

    function settleSeason(uint256 season, address[] calldata winners, uint256[] calldata amounts) external {
        require(msg.sender == ops, "ops only");
        require(winners.length == amounts.length, "length mismatch");
        uint256 total;
        for (uint256 i = 0; i < winners.length; i++) {
            total += amounts[i];
            require(clam.transfer(winners[i], amounts[i]), "transfer");
        }
        emit SeasonSettled(season, total, winners.length);
    }
}
