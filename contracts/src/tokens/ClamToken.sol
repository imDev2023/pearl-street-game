// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ERC20Base} from "./ERC20Base.sol";

/// CLAM: the USDG-backed game stable. 6 decimals, matching USDG.
/// Only the ClamVault can mint or burn; the vault address is set exactly once by the
/// deployer and can never change, so no later actor can gain mint rights.
contract ClamToken is ERC20Base {
    address public vault;
    address private immutable deployer;

    constructor() ERC20Base("Pearl Street CLAM", "CLAM", 6) {
        deployer = msg.sender;
    }

    function setVault(address vault_) external {
        require(msg.sender == deployer && vault == address(0), "vault set once");
        require(vault_ != address(0), "zero vault");
        vault = vault_;
    }

    function mint(address to, uint256 value) external {
        require(msg.sender == vault, "vault only");
        _mint(to, value);
    }

    function burn(address from, uint256 value) external {
        require(msg.sender == vault, "vault only");
        _burn(from, value);
    }
}
