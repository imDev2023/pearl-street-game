// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {GameConstants as C} from "./GameConstants.sol";
import {ClamToken} from "./tokens/ClamToken.sol";
import {SafeERC20Minimal} from "./lib/SafeERC20Minimal.sol";
import {IERC20Minimal} from "./interfaces/IERC20Minimal.sol";

/// The CLAM vault: the only place CLAM is minted or burned.
///
/// Locked invariants (docs/PRD.md, docs/adr/0002, non-negotiable):
/// - reserve == CLAM totalSupply at all times; fees are skimmed in CLAM at the edges and
///   minted to the FeeRouter, so every CLAM in existence is backed by one USDG unit.
/// - Redemption is never pausable: there is no pause, no owner, no admin, no upgrade path.
/// - The reserve is never withdrawable and never deployed into yield: the only USDG outflow
///   is `redeem`, and it burns an equal amount of CLAM.
/// - Rounding always favors the protocol (fees round up).
///
/// Deposits mint against the USDG actually received (balance delta), so a non-standard
/// reserve token can never leave supply above reserve; the delta measurement is guarded
/// against reentrancy because a nested deposit would otherwise be double-counted.
contract ClamVault {
    using SafeERC20Minimal for IERC20Minimal;

    uint256 public constant MINT_FEE_BPS = C.VAULT_MINT_FEE_BPS;
    uint256 public constant REDEEM_FEE_BPS = C.VAULT_REDEEM_FEE_BPS;
    uint256 public constant BPS = C.BPS;

    IERC20Minimal public immutable usdg;
    ClamToken public immutable clam;
    /// All fee CLAM is minted here; the router forwards it per GameConstants.FEES_TO_POOL_BPS.
    address public immutable feeRouter;

    uint256 private _entered = 1;

    event Deposited(address indexed player, uint256 usdgIn, uint256 clamOut, uint256 feeClam);
    event Redeemed(address indexed player, uint256 clamIn, uint256 usdgOut, uint256 feeClam);

    error ZeroAddress();
    error ZeroAmount();
    error NothingReceived();
    error Reentrancy();

    modifier nonReentrant() {
        if (_entered != 1) revert Reentrancy();
        _entered = 2;
        _;
        _entered = 1;
    }

    constructor(IERC20Minimal usdg_, ClamToken clam_, address feeRouter_) {
        if (address(usdg_) == address(0) || address(clam_) == address(0) || feeRouter_ == address(0)) {
            revert ZeroAddress();
        }
        usdg = usdg_;
        clam = clam_;
        feeRouter = feeRouter_;
    }

    /// Deposit USDG and receive CLAM 1:1 minus the mint fee (2%, rounded up), which is
    /// minted to the FeeRouter. CLAM minted always equals USDG received.
    function deposit(uint256 usdgIn) external nonReentrant returns (uint256 clamOut) {
        if (usdgIn == 0) revert ZeroAmount();
        uint256 before = usdg.balanceOf(address(this));
        usdg.safeTransferFrom(msg.sender, address(this), usdgIn);
        uint256 received = usdg.balanceOf(address(this)) - before;
        if (received == 0) revert NothingReceived();
        uint256 fee = _ceilBps(received, MINT_FEE_BPS);
        clamOut = received - fee;
        clam.mint(msg.sender, clamOut);
        clam.mint(feeRouter, fee);
        emit Deposited(msg.sender, received, clamOut, fee);
    }

    /// Burn CLAM and receive USDG 1:1 minus the redeem fee (5%, rounded up), which is
    /// re-minted to the FeeRouter. Needs no approval: the caller's own CLAM is burned.
    function redeem(uint256 clamIn) external nonReentrant returns (uint256 usdgOut) {
        if (clamIn == 0) revert ZeroAmount();
        uint256 fee = _ceilBps(clamIn, REDEEM_FEE_BPS);
        usdgOut = clamIn - fee;
        clam.burn(msg.sender, clamIn);
        clam.mint(feeRouter, fee);
        usdg.safeTransfer(msg.sender, usdgOut);
        emit Redeemed(msg.sender, clamIn, usdgOut, fee);
    }

    /// USDG held by the vault.
    function reserve() external view returns (uint256) {
        return usdg.balanceOf(address(this));
    }

    /// The invariant, readable on-chain: USDG held minus CLAM supply. Must always be zero.
    /// (Positive only if someone sends USDG straight to the vault; never negative.)
    function reserveSurplus() external view returns (int256) {
        return int256(usdg.balanceOf(address(this))) - int256(clam.totalSupply());
    }

    /// Fee previews for clients: exact amounts a deposit or redeem of `amount` yields.
    function previewDeposit(uint256 usdgIn) external pure returns (uint256 clamOut, uint256 fee) {
        fee = _ceilBps(usdgIn, MINT_FEE_BPS);
        clamOut = usdgIn - fee;
    }

    function previewRedeem(uint256 clamIn) external pure returns (uint256 usdgOut, uint256 fee) {
        fee = _ceilBps(clamIn, REDEEM_FEE_BPS);
        usdgOut = clamIn - fee;
    }

    function _ceilBps(uint256 amount, uint256 bps) private pure returns (uint256) {
        return (amount * bps + BPS - 1) / BPS;
    }
}
