// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {ClamToken} from "../src/tokens/ClamToken.sol";
import {ClamVault} from "../src/ClamVault.sol";
import {IERC20Minimal} from "../src/interfaces/IERC20Minimal.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";

/// T-002: deploys ClamToken, FeeRouter, ClamVault (in that order) and wires the vault once.
///
/// Wallet comes from the CLI, never from env: `--trezor --sender <addr>` on mainnet,
/// `--private-key` on testnet/Anvil.
///
/// Environment:
///   USDG        reserve token. Mainnet (4663) MUST be the canonical USDG and mocks are refused.
///               Testnet (46630) / Anvil: if unset, a MockUSDG is deployed.
///   TREASURY    FeeRouter treasury leg (receives 0 under FEES_TO_POOL_BPS = 100%, but is
///               immutable, so set it right). Mainnet: required. Else default: the sender.
///   PRIZE_POOL  FeeRouter pool leg. Mainnet: required (the deployed PrizePool). Else default:
///               the sender, as a placeholder until the pool exists on that network.
///
/// Writes deployments/<chainid>.json.
contract DeployClam is Script {
    address internal constant CANONICAL_USDG = 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168;
    uint256 internal constant MAINNET = 4663;
    uint256 internal constant TESTNET = 46630;

    function run() external {
        address sender = msg.sender;
        bool mainnet = block.chainid == MAINNET;
        require(mainnet || block.chainid == TESTNET || block.chainid == 31337, "unknown chain");

        address usdgAddr = vm.envOr("USDG", address(0));
        address treasury = vm.envOr("TREASURY", mainnet ? address(0) : sender);
        address prizePool = vm.envOr("PRIZE_POOL", mainnet ? address(0) : sender);
        if (mainnet) {
            require(usdgAddr == CANONICAL_USDG, "mainnet: USDG must be canonical");
            require(
                treasury != address(0) && prizePool != address(0), "mainnet: TREASURY and PRIZE_POOL required"
            );
            require(prizePool != sender, "mainnet: PRIZE_POOL must be the pool contract");
        }

        vm.startBroadcast();
        if (usdgAddr == address(0)) {
            usdgAddr = address(new MockUSDG());
            console2.log("MockUSDG deployed", usdgAddr);
        }
        ClamToken clam = new ClamToken();
        FeeRouter router = new FeeRouter(IERC20Minimal(address(clam)), prizePool, treasury);
        ClamVault vault = new ClamVault(IERC20Minimal(usdgAddr), clam, address(router));
        clam.setVault(address(vault));
        vm.stopBroadcast();

        require(clam.vault() == address(vault), "wiring");
        require(address(vault.usdg()) == usdgAddr && vault.feeRouter() == address(router), "wiring");

        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "deployer", sender);
        vm.serializeAddress(obj, "usdg", usdgAddr);
        vm.serializeAddress(obj, "clam", address(clam));
        vm.serializeAddress(obj, "feeRouter", address(router));
        vm.serializeAddress(obj, "vault", address(vault));
        vm.serializeAddress(obj, "treasury", treasury);
        vm.serializeAddress(obj, "prizePool", prizePool);
        string memory out = vm.serializeUint(obj, "timestamp", block.timestamp);
        vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), ".json"));

        console2.log("usdg", usdgAddr);
        console2.log("clam", address(clam));
        console2.log("feeRouter", address(router));
        console2.log("vault", address(vault));
    }
}
