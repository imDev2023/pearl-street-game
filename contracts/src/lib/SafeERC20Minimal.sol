// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20Minimal} from "../interfaces/IERC20Minimal.sol";

/// Safe wrappers for the two ERC-20 calls the protocol makes with untrusted return
/// behaviour: tolerate tokens that return nothing, reject tokens that return false,
/// and revert on calls to non-contracts.
library SafeERC20Minimal {
    error TokenCallFailed();

    function safeTransfer(IERC20Minimal token, address to, uint256 value) internal {
        _call(address(token), abi.encodeCall(IERC20Minimal.transfer, (to, value)));
    }

    function safeTransferFrom(IERC20Minimal token, address from, address to, uint256 value) internal {
        _call(address(token), abi.encodeCall(IERC20Minimal.transferFrom, (from, to, value)));
    }

    function _call(address token, bytes memory data) private {
        if (token.code.length == 0) revert TokenCallFailed();
        (bool ok, bytes memory ret) = token.call(data);
        if (!ok || (ret.length != 0 && !abi.decode(ret, (bool)))) revert TokenCallFailed();
    }
}
