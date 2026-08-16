// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {HarborBell} from "../src/HarborBell.sol";

/// @notice Deploys HarborBell to validate the deploy + verify pipeline.
///
/// Testnet (chain 46630):
///   forge script script/DeployHarborBell.s.sol \
///     --rpc-url robinhood_testnet --broadcast \
///     --verify --verifier blockscout \
///     --verifier-url https://explorer.testnet.chain.robinhood.com/api/
///
/// Mainnet (chain 4663) uses --rpc-url robinhood and
/// --verifier-url https://robinhoodchain.blockscout.com/api/
///
/// Set PRIVATE_KEY in the environment; never commit keys.
/// Robinhood Chain note: the sequencer can silently drop screened transactions,
/// so if the broadcast hangs, re-check inclusion on Blockscout instead of assuming it landed.
contract DeployHarborBell is Script {
    function run() external returns (HarborBell bell) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        bell = new HarborBell();
        vm.stopBroadcast();
        console.log("HarborBell deployed at", address(bell));
    }
}
