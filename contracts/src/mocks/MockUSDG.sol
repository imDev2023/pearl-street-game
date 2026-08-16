// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20Base} from "../tokens/ERC20Base.sol";

/// Test-only USDG stand-in for testnet 46630, which has no real USDG deployment.
/// 6 decimals like the real token. The faucet is open: this token must never carry value.
contract MockUSDG is ERC20Base {
    constructor() ERC20Base("Mock USDG", "mUSDG", 6) {}

    uint256 public constant FAUCET_CAP = 10_000_000 * 1e6;

    function faucet(uint256 amount) external {
        require(amount <= FAUCET_CAP, "faucet cap per call");
        _mint(msg.sender, amount);
    }

    function mintTo(address to, uint256 amount) external {
        require(amount <= FAUCET_CAP, "faucet cap per call");
        _mint(to, amount);
    }
}
