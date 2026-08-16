// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {EconomyBase} from "./EconomyBase.t.sol";
import {GameConstants as C} from "../src/GameConstants.sol";
import {ClamVault} from "../src/ClamVault.sol";
import {ClamToken} from "../src/tokens/ClamToken.sol";
import {Doubloons} from "../src/tokens/Doubloons.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {MockAggregator} from "../src/mocks/MockAggregator.sol";
import {PearlCreatures} from "../src/PearlCreatures.sol";
import {PrizePool} from "../src/PrizePool.sol";
import {FeeRouter} from "../src/FeeRouter.sol";
import {VoyageGame} from "../src/VoyageGame.sol";

/// Randomized action handler: deposits, redeems, purchases, voyages, settlements,
/// claims, sweeps, price moves, and time warps, from three actors.
contract EconomyHandler is Test {
    MockUSDG public usdg;
    ClamToken public clam;
    ClamVault public vault;
    PearlCreatures public creatures;
    VoyageGame public game;
    PrizePool public pool;
    FeeRouter public router;
    Doubloons public doubloons;
    MockAggregator[] public feeds;

    address[3] public actors;
    uint256[] public openVoyages;
    uint256 public ghost_maxObservedRelease;
    bool public ghost_releaseCapViolated;

    constructor(
        MockUSDG usdg_,
        ClamToken clam_,
        ClamVault vault_,
        PearlCreatures creatures_,
        VoyageGame game_,
        PrizePool pool_,
        FeeRouter router_,
        Doubloons doubloons_,
        MockAggregator[] memory feeds_
    ) {
        usdg = usdg_;
        clam = clam_;
        vault = vault_;
        creatures = creatures_;
        game = game_;
        pool = pool_;
        router = router_;
        doubloons = doubloons_;
        feeds = feeds_;
        actors[0] = makeAddr("actor0");
        actors[1] = makeAddr("actor1");
        actors[2] = makeAddr("actor2");
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % 3];
    }

    function deposit(uint256 seed, uint96 amount) external {
        address a = _actor(seed);
        uint256 amt = uint256(amount) % 100_000e6 + 1;
        usdg.mintTo(a, amt);
        vm.startPrank(a);
        usdg.approve(address(vault), amt);
        vault.deposit(amt);
        vm.stopPrank();
    }

    function redeem(uint256 seed, uint96 amount) external {
        address a = _actor(seed);
        uint256 bal = clam.balanceOf(a);
        if (bal == 0) return;
        vm.prank(a);
        vault.redeem(uint256(amount) % bal + 1);
    }

    function buyCreatures(uint256 seed, uint8 count) external {
        address a = _actor(seed);
        uint256 n = uint256(count) % 3 + 1;
        uint256 already = creatures.mintedBy(a);
        if (already + n > C.GEN0_PER_WALLET_CAP) return;
        if (creatures.totalMinted() + n > C.GEN0_SUPPLY) return;
        uint256 total = C.GEN0_PRICE_PUBLIC * n;
        uint256 gross = (total * C.BPS) / (C.BPS - C.VAULT_MINT_FEE_BPS) + 1;
        usdg.mintTo(a, gross);
        vm.startPrank(a);
        usdg.approve(address(vault), gross);
        vault.deposit(gross);
        clam.approve(address(creatures), total);
        creatures.buyGen0(n);
        vm.stopPrank();
    }

    function sail(uint256 seed, uint8 tickerSeed) external {
        address a = _actor(seed);
        uint256 owned = creatures.mintedBy(a);
        if (owned == 0) return;
        // Find one of the actor's creatures with energy (ids are globally sequential).
        uint256 total = creatures.totalMinted();
        for (uint256 id = 1; id <= total; id++) {
            if (creatures.ownerOf(id) != a) continue;
            if (game.energyUsed(id) + C.VOYAGE_ENERGY_COST > C.ENERGY_PER_DAY) continue;
            uint256 poolBefore = clam.balanceOf(address(pool));
            uint256[] memory ids = new uint256[](1);
            ids[0] = id;
            // Resolve the ticker BEFORE pranking: a view call would consume the prank.
            uint16 tickerId = uint16(uint256(tickerSeed) % game.tickerCount());
            vm.prank(a);
            uint256 voyageId = game.startVoyage(ids, tickerId);
            openVoyages.push(voyageId);
            // The pool may have released this call; the release must respect the cap.
            uint256 poolAfter = clam.balanceOf(address(pool));
            if (poolAfter < poolBefore) {
                uint256 released = poolBefore - poolAfter;
                if (released > (poolBefore * C.DAILY_RELEASE_BPS) / C.BPS) {
                    ghost_releaseCapViolated = true;
                }
                if (released > ghost_maxObservedRelease) ghost_maxObservedRelease = released;
            }
            return;
        }
    }

    function movePrice(uint8 feedSeed, int8 deltaPct) external {
        MockAggregator feed = feeds[uint256(feedSeed) % feeds.length];
        (, int256 answer,,,) = feed.latestRoundData();
        if (answer <= 0) return;
        int256 pct = int256(deltaPct) % 10;
        int256 next = answer + (answer * pct) / 100;
        if (next < 1e8) next = 1e8;
        vm.prank(feed.pusher());
        feed.setAnswer(next);
    }

    function settleOpen(uint256 seed) external {
        if (openVoyages.length == 0) return;
        uint256 idx = seed % openVoyages.length;
        uint256 voyageId = openVoyages[idx];
        (, uint32 day,, uint40 endTime,,,, bool settled,,) = game.voyages(voyageId);
        if (settled || block.timestamp < endTime || game.currentDay() > uint256(day) + 1) return;
        game.settle(voyageId);
    }

    function claimOpen(uint256 seed) external {
        if (openVoyages.length == 0) return;
        uint256 idx = seed % openVoyages.length;
        uint256 voyageId = openVoyages[idx];
        (address player, uint32 day,,,,,, bool settled, bool claimed,) = game.voyages(voyageId);
        uint256 nowDay = game.currentDay();
        if (!settled || claimed) return;
        if (nowDay < uint256(day) + game.CLAIM_OPEN_AFTER_DAYS()) return;
        if (nowDay > uint256(day) + game.CLAIM_CLOSE_AFTER_DAYS()) return;
        vm.prank(player);
        game.claim(voyageId);
    }

    function sweepDay(uint256 daySeed) external {
        uint256 nowDay = game.currentDay();
        if (nowDay <= game.CLAIM_CLOSE_AFTER_DAYS() + 1) return;
        uint256 day = daySeed % (nowDay - game.CLAIM_CLOSE_AFTER_DAYS() - 1);
        if (game.sweptOf(day)) return;
        game.sweep(day);
    }

    function flushFees() external {
        router.flush();
    }

    function warp(uint16 seconds_) external {
        vm.warp(block.timestamp + uint256(seconds_) % (2 * 86_400) + 1);
    }
}

contract EconomyInvariants is StdInvariant, EconomyBase {
    EconomyHandler internal handler;

    function setUp() public override {
        super.setUp();
        handler = new EconomyHandler(usdg, clam, vault, creatures, game, pool, router, doubloons, feeds);
        targetContract(address(handler));
    }

    /// The locked vault invariant: USDG reserve equals CLAM supply at all times.
    function invariant_vaultReserveEqualsSupply() public view {
        assertEq(vault.reserveSurplus(), 0);
    }

    /// The pool never releases more than 1.5% of its balance in a day (handler-observed).
    function invariant_dailyReleaseCapHolds() public view {
        assertFalse(handler.ghost_releaseCapViolated());
    }

    /// Game CLAM accounting: the game holds exactly the unclaimed, unswept tranches.
    function invariant_gameHoldsExactlyUnclaimedHauls() public view {
        uint256 expected;
        uint256 nowDay = game.currentDay();
        for (uint256 day = 0; day <= nowDay; day++) {
            if (game.sweptOf(day)) continue;
            expected += game.trancheOf(day) - game.claimedOf(day);
        }
        assertEq(clam.balanceOf(address(game)), expected);
    }

    /// Every CLAM in the system is accounted for: supply equals the sum of all holdings.
    function invariant_clamConservation() public view {
        uint256 held = clam.balanceOf(address(pool)) + clam.balanceOf(address(lbPot))
            + clam.balanceOf(address(game)) + clam.balanceOf(address(router)) + clam.balanceOf(treasury);
        for (uint256 i = 0; i < 3; i++) {
            held += clam.balanceOf(handler.actors(i));
        }
        assertEq(clam.totalSupply(), held);
    }
}
