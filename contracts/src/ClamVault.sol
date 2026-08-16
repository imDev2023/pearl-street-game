// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {GameConstants as C} from "./GameConstants.sol";
import {ClamToken} from "./tokens/ClamToken.sol";

interface IERC20Minimal {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address holder) external view returns (uint256);
}

/// The CLAM vault. Locked invariants (docs/PRD.md, non-negotiable):
/// - reserve == CLAM totalSupply at all times; fees are skimmed in CLAM at the edges.
/// - Redemption is never pausable: there is no pause, no owner, no admin on this contract.
/// - The reserve is never withdrawable and never deployed into yield: the only USDG
///   outflow is redeem(), and it burns an equal amount of CLAM.
/// - Non-upgradeable by construction. Rounding always favors the protocol.
contract ClamVault {
    IERC20Minimal public immutable usdg;
    ClamToken public immutable clam;
    /// All fee CLAM goes here; the router splits it 50% pool / 50% treasury.
    address public immutable feeRouter;

    event Deposited(address indexed player, uint256 usdgIn, uint256 clamOut, uint256 feeClam);
    event Redeemed(address indexed player, uint256 clamIn, uint256 usdgOut, uint256 feeClam);

    constructor(IERC20Minimal usdg_, ClamToken clam_, address feeRouter_) {
        require(address(usdg_) != address(0) && feeRouter_ != address(0), "zero address");
        usdg = usdg_;
        clam = clam_;
        feeRouter = feeRouter_;
    }

    /// Deposit USDG 1:1; the mint fee (2%, GameConstants) is skimmed in CLAM (rounded up, favoring the protocol).
    function deposit(uint256 usdgIn) external returns (uint256 clamOut) {
        require(usdgIn > 0, "zero deposit");
        require(usdg.transferFrom(msg.sender, address(this), usdgIn), "usdg transfer");
        uint256 fee = _ceilBps(usdgIn, C.VAULT_MINT_FEE_BPS);
        clamOut = usdgIn - fee;
        clam.mint(msg.sender, clamOut);
        clam.mint(feeRouter, fee);
        emit Deposited(msg.sender, usdgIn, clamOut, fee);
    }

    /// Redeem CLAM for USDG 1:1; the redeem fee (5%, GameConstants) is skimmed in CLAM (rounded up), the rest burned.
    function redeem(uint256 clamIn) external returns (uint256 usdgOut) {
        require(clamIn > 0, "zero redeem");
        uint256 fee = _ceilBps(clamIn, C.VAULT_REDEEM_FEE_BPS);
        usdgOut = clamIn - fee;
        clam.burn(msg.sender, clamIn);
        clam.mint(feeRouter, fee);
        require(usdg.transfer(msg.sender, usdgOut), "usdg transfer");
        emit Redeemed(msg.sender, clamIn, usdgOut, fee);
    }

    /// The invariant, readable on-chain: USDG held minus CLAM supply. Must always be zero.
    function reserveSurplus() external view returns (int256) {
        return int256(usdg.balanceOf(address(this))) - int256(clam.totalSupply());
    }

    function _ceilBps(uint256 amount, uint256 bps) private pure returns (uint256) {
        return (amount * bps + C.BPS - 1) / C.BPS;
    }
}
