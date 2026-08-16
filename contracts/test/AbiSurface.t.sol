// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";

/// ABI-wide proof of the CLAM invariants: the compiled artifacts of ClamVault, ClamToken and
/// FeeRouter expose exactly the functions listed here, nothing else. In particular there is
/// no selector that can pause, withdraw, rescue, upgrade, or change an owner, and the only
/// state-changing entry points on the vault are `deposit` and `redeem`.
/// If someone adds a function, this test fails until the allowlist (and the docs) say so.
contract AbiSurfaceTest is Test {
    string[] internal forbidden = [
        "pause",
        "unpause",
        "withdraw",
        "rescue",
        "sweep",
        "skim",
        "owner",
        "admin",
        "upgrade",
        "implementation",
        "setFee",
        "setRouter",
        "setUsdg",
        "setTreasury",
        "setPool",
        "migrate",
        "emergency",
        "guardian",
        "blacklist",
        "freeze"
    ];

    function _functions(string memory artifact)
        internal
        view
        returns (string[] memory names, string[] memory muts)
    {
        string memory json = vm.readFile(artifact);
        uint256 n;
        while (vm.keyExistsJson(json, string.concat(".abi[", vm.toString(n), "]"))) {
            n++;
        }
        names = new string[](n);
        muts = new string[](n);
        uint256 k;
        for (uint256 i = 0; i < n; i++) {
            string memory base = string.concat(".abi[", vm.toString(i), "]");
            if (
                keccak256(bytes(vm.parseJsonString(json, string.concat(base, ".type"))))
                    != keccak256("function")
            ) {
                continue;
            }
            names[k] = vm.parseJsonString(json, string.concat(base, ".name"));
            muts[k] = vm.parseJsonString(json, string.concat(base, ".stateMutability"));
            k++;
        }
        assembly {
            mstore(names, k)
            mstore(muts, k)
        }
    }

    function _lower(string memory s) internal pure returns (string memory) {
        bytes memory src = bytes(s);
        bytes memory b = new bytes(src.length);
        for (uint256 i = 0; i < b.length; i++) {
            b[i] = src[i];
            if (b[i] >= 0x41 && b[i] <= 0x5A) b[i] = bytes1(uint8(b[i]) + 32);
        }
        return string(b);
    }

    function _contains(string memory hay, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(hay);
        bytes memory nd = bytes(needle);
        if (nd.length > h.length) return false;
        for (uint256 i = 0; i + nd.length <= h.length; i++) {
            bool ok = true;
            for (uint256 j = 0; j < nd.length; j++) {
                if (h[i + j] != nd[j]) {
                    ok = false;
                    break;
                }
            }
            if (ok) return true;
        }
        return false;
    }

    function _assertSurface(string memory artifact, string[] memory allowed, string[] memory mutating)
        internal
        view
    {
        (string[] memory names, string[] memory muts) = _functions(artifact);
        assertEq(names.length, allowed.length, string.concat(artifact, ": function count changed"));
        for (uint256 i = 0; i < names.length; i++) {
            bool found;
            for (uint256 j = 0; j < allowed.length; j++) {
                if (keccak256(bytes(names[i])) == keccak256(bytes(allowed[j]))) found = true;
            }
            assertTrue(found, string.concat(artifact, ": unexpected function ", names[i]));
            for (uint256 f = 0; f < forbidden.length; f++) {
                assertFalse(
                    _contains(_lower(names[i]), _lower(forbidden[f])),
                    string.concat(artifact, ": forbidden name ", names[i])
                );
            }
            bool isView = keccak256(bytes(muts[i])) == keccak256("view")
                || keccak256(bytes(muts[i])) == keccak256("pure");
            if (!isView) {
                bool allowedMut;
                for (uint256 j = 0; j < mutating.length; j++) {
                    if (keccak256(bytes(names[i])) == keccak256(bytes(mutating[j]))) allowedMut = true;
                }
                assertTrue(
                    allowedMut, string.concat(artifact, ": unexpected state-changing function ", names[i])
                );
                assertTrue(
                    keccak256(bytes(muts[i])) == keccak256("nonpayable"),
                    string.concat(artifact, ": payable function ", names[i])
                );
            }
        }
    }

    function test_clamVaultSurface() public view {
        string[] memory allowed = new string[](12);
        allowed[0] = "deposit";
        allowed[1] = "redeem";
        allowed[2] = "reserve";
        allowed[3] = "reserveSurplus";
        allowed[4] = "previewDeposit";
        allowed[5] = "previewRedeem";
        allowed[6] = "usdg";
        allowed[7] = "clam";
        allowed[8] = "feeRouter";
        allowed[9] = "MINT_FEE_BPS";
        allowed[10] = "REDEEM_FEE_BPS";
        allowed[11] = "BPS";
        string[] memory mutating = new string[](2);
        mutating[0] = "deposit";
        mutating[1] = "redeem";
        _assertSurface("out/ClamVault.sol/ClamVault.json", allowed, mutating);
    }

    function test_clamTokenSurface() public view {
        string[] memory allowed = new string[](13);
        allowed[0] = "name";
        allowed[1] = "symbol";
        allowed[2] = "decimals";
        allowed[3] = "totalSupply";
        allowed[4] = "balanceOf";
        allowed[5] = "allowance";
        allowed[6] = "approve";
        allowed[7] = "transfer";
        allowed[8] = "transferFrom";
        allowed[9] = "mint";
        allowed[10] = "burn";
        allowed[11] = "setVault";
        allowed[12] = "vault";
        string[] memory mutating = new string[](6);
        mutating[0] = "approve";
        mutating[1] = "transfer";
        mutating[2] = "transferFrom";
        mutating[3] = "mint";
        mutating[4] = "burn";
        mutating[5] = "setVault";
        _assertSurface("out/ClamToken.sol/ClamToken.json", allowed, mutating);
    }

    function test_feeRouterSurface() public view {
        string[] memory allowed = new string[](4);
        allowed[0] = "flush";
        allowed[1] = "clam";
        allowed[2] = "prizePool";
        allowed[3] = "treasury";
        string[] memory mutating = new string[](1);
        mutating[0] = "flush";
        _assertSurface("out/FeeRouter.sol/FeeRouter.json", allowed, mutating);
    }
}
