// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title HarborBell
/// @notice Throwaway pipeline-validation contract for T-001: proves that build,
///         test, deploy, and Blockscout verification all work on Robinhood Chain
///         before any real Pearl Street contract ships. Retire it once the first
///         real contract is deployed and verified.
contract HarborBell {
    event Rung(address indexed by, uint256 count, string note);

    uint256 public ringCount;

    function ring(string calldata note) external {
        ringCount += 1;
        emit Rung(msg.sender, ringCount, note);
    }
}
