// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {GameConstants as C} from "../src/GameConstants.sol";
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

/// Shared fixture wiring the whole economy exactly as the deploy script does.
abstract contract EconomyBase is Test {
    uint256 internal constant DAY = 86_400;
    uint256 internal constant STALE_AFTER = 2 * 86_400;
    uint8 internal constant NUM_TICKERS = 8;

    address internal treasury = makeAddr("treasury");

    MockUSDG internal usdg;
    ClamToken internal clam;
    Doubloons internal doubloons;
    PearlCreatures internal creatures;
    VoyageGame internal game;
    LeaderboardPot internal lbPot;
    PrizePool internal pool;
    FeeRouter internal router;
    ClamVault internal vault;
    MockAggregator[] internal feeds;

    function setUp() public virtual {
        usdg = new MockUSDG();
        clam = new ClamToken();
        doubloons = new Doubloons();
        creatures = new PearlCreatures(IERC20Minimal(address(clam)), treasury);
        game = new VoyageGame(
            IERC20Minimal(address(clam)), creatures, doubloons, block.timestamp, DAY, STALE_AFTER
        );
        lbPot = new LeaderboardPot(IERC20Minimal(address(clam)), address(this));
        pool =
            new PrizePool(IERC20Minimal(address(clam)), address(game), address(lbPot), block.timestamp, DAY);
        router = new FeeRouter(IERC20Minimal(address(clam)), address(pool), treasury);
        vault = new ClamVault(IERC20Minimal(address(usdg)), clam, address(router));

        clam.setVault(address(vault));
        doubloons.setGame(address(game));
        creatures.setPrizePool(address(pool));
        game.setPool(pool);

        for (uint8 i = 0; i < NUM_TICKERS; i++) {
            MockAggregator feed = new MockAggregator(address(this), "MOCK / USD");
            feed.setAnswer(100e8);
            feeds.push(feed);
            game.addTicker(IAggregatorV3(address(feed)), i);
        }
    }

    /// Fund a player with enough CLAM (via the vault, paying the real 1% fee) to buy
    /// `count` creatures at the public price, and buy them.
    function _buyCreatures(address player, uint256 count) internal returns (uint256 firstId) {
        uint256 total = C.GEN0_PRICE_PUBLIC * count;
        uint256 gross = (total * C.BPS) / (C.BPS - C.VAULT_MINT_FEE_BPS) + 1;
        usdg.mintTo(player, gross);
        firstId = creatures.totalMinted() + 1;
        vm.startPrank(player);
        usdg.approve(address(vault), gross);
        vault.deposit(gross);
        clam.approve(address(creatures), total);
        creatures.buyGen0(count);
        vm.stopPrank();
    }

    /// A party owned by `player` whose creatures all exist; ids are sequential from mint.
    function _party(uint256 firstId, uint256 size) internal pure returns (uint256[] memory ids) {
        ids = new uint256[](size);
        for (uint256 i = 0; i < size; i++) {
            ids[i] = firstId + i;
        }
    }
}
