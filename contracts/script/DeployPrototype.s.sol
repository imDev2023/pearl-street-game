// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {ClamToken} from "../src/tokens/ClamToken.sol";
import {Doubloons} from "../src/tokens/Doubloons.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {MockAggregator} from "../src/mocks/MockAggregator.sol";
import {ClamVault, IERC20Minimal} from "../src/ClamVault.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {PrizePool} from "../src/PrizePool.sol";
import {LeaderboardPot} from "../src/LeaderboardPot.sol";
import {PearlCreatures} from "../src/PearlCreatures.sol";
import {VoyageGame, IAggregatorV3} from "../src/VoyageGame.sol";

/// Deploys the full economy prototype. Environment:
///   DAY_LENGTH   game-day seconds (86400 for Anvil replay, 600 for the testnet run)
///   STALE_AFTER  feed staleness threshold in seconds (default 2 * DAY_LENGTH)
///   TREASURY     ops treasury address (default: the deployer)
/// The deployer becomes ops (feed setup, allowlist, leaderboard settlement).
/// Eight mock tickers are wired, sectors 0-7, all starting at $100.
contract DeployPrototype is Script {
    string[8] internal tickerNames = ["AAPL", "NVDA", "TSLA", "AMZN", "MSFT", "GOOGL", "META", "HOOD"];

    function run() external {
        uint256 dayLength = vm.envOr("DAY_LENGTH", uint256(86_400));
        uint256 staleAfter = vm.envOr("STALE_AFTER", dayLength * 2);
        address deployer = msg.sender;
        address treasury = vm.envOr("TREASURY", deployer);

        vm.startBroadcast();
        MockUSDG usdg = new MockUSDG();
        ClamToken clam = new ClamToken();
        Doubloons doubloons = new Doubloons();
        PearlCreatures creatures = new PearlCreatures(IERC20Minimal(address(clam)), treasury);
        VoyageGame game = new VoyageGame(
            IERC20Minimal(address(clam)), creatures, doubloons, block.timestamp, dayLength, staleAfter
        );
        LeaderboardPot lbPot = new LeaderboardPot(IERC20Minimal(address(clam)), deployer);
        PrizePool pool = new PrizePool(
            IERC20Minimal(address(clam)), address(game), address(lbPot), block.timestamp, dayLength
        );
        FeeRouter router = new FeeRouter(IERC20Minimal(address(clam)), address(pool), treasury);
        ClamVault vault = new ClamVault(IERC20Minimal(address(usdg)), clam, address(router));

        clam.setVault(address(vault));
        doubloons.setGame(address(game));
        creatures.setPrizePool(address(pool));
        game.setPool(pool);

        for (uint8 i = 0; i < 8; i++) {
            MockAggregator feed =
                new MockAggregator(deployer, string.concat("Mock ", tickerNames[i], " / USD"));
            feed.setAnswer(100e8);
            game.addTicker(IAggregatorV3(address(feed)), i);
            console2.log(string.concat("feed ", tickerNames[i]), address(feed));
        }
        vm.stopBroadcast();

        console2.log("usdg", address(usdg));
        console2.log("clam", address(clam));
        console2.log("doubloons", address(doubloons));
        console2.log("creatures", address(creatures));
        console2.log("game", address(game));
        console2.log("lbPot", address(lbPot));
        console2.log("pool", address(pool));
        console2.log("router", address(router));
        console2.log("vault", address(vault));
        console2.log("dayLength", dayLength);
    }
}
