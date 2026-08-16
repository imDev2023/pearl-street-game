// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {ClamVault} from "../../src/ClamVault.sol";

/// Test-only reserve tokens with non-standard behaviour, to prove the vault's
/// safe-call and balance-delta handling. Never deployed.
abstract contract WeirdBase {
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mintTo(address to, uint256 v) external {
        balanceOf[to] += v;
        totalSupply += v;
    }

    function approve(address s, uint256 v) external returns (bool) {
        allowance[msg.sender][s] = v;
        return true;
    }

    function _move(address from, address to, uint256 v) internal {
        require(balanceOf[from] >= v, "bal");
        balanceOf[from] -= v;
        balanceOf[to] += v;
    }

    function _spend(address from, uint256 v) internal {
        uint256 a = allowance[from][msg.sender];
        require(a >= v, "allow");
        allowance[from][msg.sender] = a - v;
    }
}

/// USDT-style: transfer functions return nothing.
contract NoReturnToken is WeirdBase {
    function transfer(address to, uint256 v) external {
        _move(msg.sender, to, v);
    }

    function transferFrom(address from, address to, uint256 v) external {
        _spend(from, v);
        _move(from, to, v);
    }
}

/// Returns false instead of reverting.
contract FalseReturnToken is WeirdBase {
    function transfer(address, uint256) external pure returns (bool) {
        return false;
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return false;
    }
}

/// Takes 1% on every transfer.
contract FeeOnTransferToken is WeirdBase {
    function transfer(address to, uint256 v) external returns (bool) {
        uint256 cut = v / 100;
        _move(msg.sender, to, v - cut);
        _move(msg.sender, address(0xdead), cut);
        return true;
    }

    function transferFrom(address from, address to, uint256 v) external returns (bool) {
        _spend(from, v);
        uint256 cut = v / 100;
        _move(from, to, v - cut);
        _move(from, address(0xdead), cut);
        return true;
    }
}

/// Reenters the vault during transferFrom, trying to double-count the deposit delta.
contract ReentrantToken is WeirdBase {
    ClamVault public vault;
    bool public armed;
    bytes public lastRevert;

    function arm(ClamVault v) external {
        vault = v;
        armed = true;
    }

    function transfer(address to, uint256 v) external returns (bool) {
        _move(msg.sender, to, v);
        return true;
    }

    function transferFrom(address from, address to, uint256 v) external returns (bool) {
        _spend(from, v);
        _move(from, to, v);
        if (armed) {
            armed = false;
            try vault.deposit(v) {}
            catch (bytes memory reason) {
                lastRevert = reason;
            }
        }
        return true;
    }
}
