// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// AggregatorV3Interface-compatible mock feed. 8 decimals, matching the real Chainlink
/// equity feeds on chain 4663. A designated pusher sets prices; updatedAt tracks the push,
/// so staleness behaves like the real feed (including the weekend-freeze case the
/// robinhood-4663 profile documents: no pushes means updatedAt stops advancing).
contract MockAggregator {
    address public immutable pusher;
    string public description;
    uint8 public constant decimals = 8;

    int256 private answer;
    uint256 private updatedAt;
    uint80 private roundId;

    constructor(address pusher_, string memory description_) {
        pusher = pusher_;
        description = description_;
    }

    function setAnswer(int256 answer_) external {
        require(msg.sender == pusher, "pusher only");
        require(answer_ > 0, "positive prices only");
        answer = answer_;
        updatedAt = block.timestamp;
        roundId += 1;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId_,
            int256 answer_,
            uint256 startedAt_,
            uint256 updatedAt_,
            uint80 answeredInRound_
        )
    {
        return (roundId, answer, updatedAt, updatedAt, roundId);
    }
}
