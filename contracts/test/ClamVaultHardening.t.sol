// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameConstants as C} from "../src/GameConstants.sol";
import {ClamVault} from "../src/ClamVault.sol";
import {IERC20Minimal} from "../src/interfaces/IERC20Minimal.sol";
import {ClamToken} from "../src/tokens/ClamToken.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {SafeERC20Minimal} from "../src/lib/SafeERC20Minimal.sol";
import {NoReturnToken, FalseReturnToken, FeeOnTransferToken, ReentrantToken} from "./mocks/WeirdTokens.sol";

/// T-002 hardening: exact fee math at every boundary, protocol-favoring rounding,
/// non-standard reserve tokens, reentrancy, and the token's permission surface.
contract ClamVaultHardeningTest is Test {
    MockUSDG internal usdg;
    ClamToken internal clam;
    ClamVault internal vault;
    FeeRouter internal router;
    address internal pool = makeAddr("pool");
    address internal treasury = makeAddr("treasury");
    address internal alice = makeAddr("alice");

    function setUp() public {
        usdg = new MockUSDG();
        clam = new ClamToken();
        router = new FeeRouter(IERC20Minimal(address(clam)), pool, treasury);
        vault = new ClamVault(IERC20Minimal(address(usdg)), clam, address(router));
        clam.setVault(address(vault));
    }

    function _ceil(uint256 amount, uint256 bps) internal pure returns (uint256) {
        return (amount * bps + C.BPS - 1) / C.BPS;
    }

    // ---- fee math -------------------------------------------------------------------

    function testFuzz_depositConservesReserveAndCeilsFee(uint256 amount) public {
        amount = bound(amount, 1, 1e12); // up to 1,000,000 USDG (mock faucet cap)
        usdg.mintTo(alice, amount);
        vm.startPrank(alice);
        usdg.approve(address(vault), amount);
        uint256 out = vault.deposit(amount);
        vm.stopPrank();
        uint256 fee = _ceil(amount, C.VAULT_MINT_FEE_BPS);
        assertEq(out, amount - fee, "clamOut");
        assertEq(clam.balanceOf(address(router)), fee, "fee at router");
        assertEq(clam.totalSupply(), amount, "supply == deposit");
        assertEq(vault.reserveSurplus(), 0, "reserve == supply");
        (uint256 pOut, uint256 pFee) = vault.previewDeposit(amount);
        assertEq(pOut, out);
        assertEq(pFee, fee);
        // Rounding favors the protocol: fee is never below the exact percentage.
        assertGe(fee * C.BPS, amount * C.VAULT_MINT_FEE_BPS);
    }

    function testFuzz_redeemConservesReserveAndCeilsFee(uint256 depositAmt, uint256 redeemAmt) public {
        depositAmt = bound(depositAmt, 1, 1e12);
        usdg.mintTo(alice, depositAmt);
        vm.startPrank(alice);
        usdg.approve(address(vault), depositAmt);
        uint256 held = vault.deposit(depositAmt);
        vm.assume(held > 0);
        redeemAmt = bound(redeemAmt, 1, held);
        uint256 usdgBefore = usdg.balanceOf(alice);
        uint256 out = vault.redeem(redeemAmt);
        vm.stopPrank();
        uint256 fee = _ceil(redeemAmt, C.VAULT_REDEEM_FEE_BPS);
        assertEq(out, redeemAmt - fee, "usdgOut");
        assertEq(usdg.balanceOf(alice) - usdgBefore, out, "paid");
        assertEq(vault.reserveSurplus(), 0, "reserve == supply after redeem");
        assertEq(clam.totalSupply(), usdg.balanceOf(address(vault)));
        (uint256 pOut, uint256 pFee) = vault.previewRedeem(redeemAmt);
        assertEq(pOut, out);
        assertEq(pFee, fee);
        assertGe(fee * C.BPS, redeemAmt * C.VAULT_REDEEM_FEE_BPS);
    }

    function test_oneUnitDepositMintsNothingToPlayerButKeepsInvariant() public {
        usdg.mintTo(alice, 1);
        vm.startPrank(alice);
        usdg.approve(address(vault), 1);
        uint256 out = vault.deposit(1);
        vm.stopPrank();
        assertEq(out, 0, "1 unit is all fee");
        assertEq(clam.balanceOf(address(router)), 1);
        assertEq(vault.reserveSurplus(), 0);
    }

    function test_oneUnitRedeemPaysNothingButKeepsInvariant() public {
        usdg.mintTo(alice, 100);
        vm.startPrank(alice);
        usdg.approve(address(vault), 100);
        vault.deposit(100); // alice holds 98
        uint256 out = vault.redeem(1); // fee ceil(0.05) = 1
        vm.stopPrank();
        assertEq(out, 0);
        assertEq(vault.reserveSurplus(), 0);
        assertEq(clam.balanceOf(alice), 97);
    }

    function test_dustCannotExtractValue() public {
        // Repeated 1-unit redeems burn CLAM into fees; the player never receives USDG.
        usdg.mintTo(alice, 1_000);
        vm.startPrank(alice);
        usdg.approve(address(vault), 1_000);
        vault.deposit(1_000); // 980 CLAM
        for (uint256 i = 0; i < 50; i++) {
            vault.redeem(1);
        }
        vm.stopPrank();
        assertEq(usdg.balanceOf(alice), 0);
        assertEq(clam.balanceOf(alice), 930);
        assertEq(vault.reserveSurplus(), 0);
    }

    function test_zeroAmountsRevert() public {
        vm.expectRevert(ClamVault.ZeroAmount.selector);
        vault.deposit(0);
        vm.expectRevert(ClamVault.ZeroAmount.selector);
        vault.redeem(0);
    }

    function test_feeConstantsMatchGameConstants() public view {
        assertEq(vault.MINT_FEE_BPS(), C.VAULT_MINT_FEE_BPS);
        assertEq(vault.REDEEM_FEE_BPS(), C.VAULT_REDEEM_FEE_BPS);
        assertEq(vault.MINT_FEE_BPS(), 200);
        assertEq(vault.REDEEM_FEE_BPS(), 500);
    }

    // ---- reserve token behaviour ------------------------------------------------------

    function _freshVault(address token) internal returns (ClamVault v, ClamToken t) {
        t = new ClamToken();
        FeeRouter r = new FeeRouter(IERC20Minimal(address(t)), pool, treasury);
        v = new ClamVault(IERC20Minimal(token), t, address(r));
        t.setVault(address(v));
    }

    function test_noReturnTokenWorks() public {
        NoReturnToken tok = new NoReturnToken();
        (ClamVault v, ClamToken t) = _freshVault(address(tok));
        tok.mintTo(alice, 100e6);
        vm.startPrank(alice);
        tok.approve(address(v), 100e6);
        assertEq(v.deposit(100e6), 98e6);
        assertEq(v.redeem(98e6), 98e6 - 4_900_000);
        vm.stopPrank();
        assertEq(int256(tok.balanceOf(address(v))) - int256(t.totalSupply()), 0);
    }

    function test_falseReturnTokenReverts() public {
        FalseReturnToken tok = new FalseReturnToken();
        (ClamVault v,) = _freshVault(address(tok));
        tok.mintTo(alice, 100e6);
        vm.startPrank(alice);
        tok.approve(address(v), 100e6);
        vm.expectRevert(SafeERC20Minimal.TokenCallFailed.selector);
        v.deposit(100e6);
        vm.stopPrank();
    }

    function test_feeOnTransferTokenMintsOnlyWhatArrived() public {
        FeeOnTransferToken tok = new FeeOnTransferToken();
        (ClamVault v, ClamToken t) = _freshVault(address(tok));
        tok.mintTo(alice, 100e6);
        vm.startPrank(alice);
        tok.approve(address(v), 100e6);
        uint256 out = v.deposit(100e6); // 99e6 arrives; fee ceil(2%) = 1.98e6
        vm.stopPrank();
        assertEq(out, 99e6 - 1_980_000);
        assertEq(t.totalSupply(), 99e6, "supply == what arrived");
        assertEq(int256(tok.balanceOf(address(v))) - int256(t.totalSupply()), 0);
    }

    function test_reentrantDepositIsRejected() public {
        ReentrantToken tok = new ReentrantToken();
        (ClamVault v,) = _freshVault(address(tok));
        tok.mintTo(alice, 200e6);
        tok.arm(v);
        vm.startPrank(alice);
        tok.approve(address(v), 200e6);
        uint256 out = v.deposit(100e6);
        vm.stopPrank();
        // The nested deposit was rejected by the guard, and the outer one counted only its own delta.
        assertEq(tok.lastRevert(), abi.encodeWithSelector(ClamVault.Reentrancy.selector));
        assertEq(out, 98e6);
        assertEq(int256(tok.balanceOf(address(v))) - int256(ClamToken(address(v.clam())).totalSupply()), 0);
    }

    function test_directUsdgTransferOnlyRaisesSurplusNeverSupply() public {
        usdg.mintTo(address(vault), 5e6);
        assertEq(vault.reserveSurplus(), 5e6);
        assertEq(clam.totalSupply(), 0);
        // and it is unreachable: no function moves it (see AbiSurface.t.sol)
    }

    // ---- token permissions --------------------------------------------------------------

    function test_onlyVaultMintsAndBurns() public {
        vm.expectRevert(bytes("vault only"));
        clam.mint(alice, 1);
        vm.expectRevert(bytes("vault only"));
        clam.burn(alice, 1);
    }

    function test_vaultIsSetExactlyOnceByDeployer() public {
        ClamToken t = new ClamToken();
        vm.prank(alice);
        vm.expectRevert(bytes("vault set once"));
        t.setVault(alice);
        t.setVault(address(vault));
        vm.expectRevert(bytes("vault set once"));
        t.setVault(alice);
        assertEq(t.vault(), address(vault));
    }

    function test_constructorRejectsZeroAddresses() public {
        vm.expectRevert(ClamVault.ZeroAddress.selector);
        new ClamVault(IERC20Minimal(address(0)), clam, address(router));
        vm.expectRevert(ClamVault.ZeroAddress.selector);
        new ClamVault(IERC20Minimal(address(usdg)), ClamToken(address(0)), address(router));
        vm.expectRevert(ClamVault.ZeroAddress.selector);
        new ClamVault(IERC20Minimal(address(usdg)), clam, address(0));
    }
}
