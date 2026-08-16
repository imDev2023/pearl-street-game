// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// Doubloons: the soulbound grind currency. Not an ERC20 on purpose - there is no
/// transfer, no approval, and no path by which a Doubloon can reach an exchange.
/// Only the game can credit; spending (future sinks) only burns.
contract Doubloons {
    address public game;
    address private immutable deployer;

    mapping(address => uint256) public balanceOf;
    uint256 public totalEarned;

    event Earned(address indexed player, uint256 amount);
    event Spent(address indexed player, uint256 amount);

    constructor() {
        deployer = msg.sender;
    }

    function setGame(address game_) external {
        require(msg.sender == deployer && game == address(0), "game set once");
        require(game_ != address(0), "zero game");
        game = game_;
    }

    function credit(address player, uint256 amount) external {
        require(msg.sender == game, "game only");
        balanceOf[player] += amount;
        totalEarned += amount;
        emit Earned(player, amount);
    }

    function spend(address player, uint256 amount) external {
        require(msg.sender == game, "game only");
        uint256 bal = balanceOf[player];
        require(bal >= amount, "balance");
        unchecked {
            balanceOf[player] = bal - amount;
        }
        emit Spent(player, amount);
    }
}
