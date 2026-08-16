// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {GameConstants as C} from "./GameConstants.sol";
import {IERC20Minimal} from "./ClamVault.sol";
import {PearlCreatures} from "./PearlCreatures.sol";
import {PrizePool} from "./PrizePool.sol";
import {Doubloons} from "./tokens/Doubloons.sol";

interface IAggregatorV3 {
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
    function decimals() external view returns (uint8);
}

/// The voyage loop. Each game day the prize pool releases a haul tranche; voyages started
/// that day earn modifier-weighted shares of it, claimable after the day's weights are
/// final. All clocks are timestamp-based (never block.number - Arbitrum Nitro).
///
/// Oracle policy (robinhood-4663 profile): a stale feed VOIDS the modifier and pays the
/// base haul - settlement never reverts on staleness, because weekend-stale equity prices
/// are normal operation on this chain, not an incident. This contract is the single
/// canonical price-reading path for the game. Real feeds return the full token price
/// (ERC-8056 multiplier already applied); never multiply by uiMultiplier here.
contract VoyageGame {
    struct Ticker {
        IAggregatorV3 feed;
        uint8 sector;
        bool live;
    }

    struct Voyage {
        address player;
        uint32 day;
        uint16 tickerId;
        uint40 endTime;
        int256 startTokenPriceUsd; // 0 means the feed was stale at start: modifier voided
        uint8 partySize;
        bool sectorMatch;
        bool settled;
        bool claimed;
        uint96 weight;
    }

    uint256 public constant CLAIM_OPEN_AFTER_DAYS = 2; // weights final: settle window closed
    uint256 public constant CLAIM_CLOSE_AFTER_DAYS = 9; // then dust sweeps back to the pool

    IERC20Minimal public immutable clam;
    PearlCreatures public immutable creatures;
    Doubloons public immutable doubloons;
    uint256 public immutable genesis;
    uint256 public immutable dayLength;
    uint256 public immutable voyageDuration; // dayLength / 3: three voyages fit a day
    uint256 public immutable staleAfter; // price older than this voids the modifier
    address public immutable ops;

    PrizePool public pool;
    Ticker[] public tickers;
    Voyage[] public voyages;

    // creatureId => (day << 8) | energyUsed, packed.
    mapping(uint256 => uint256) private energyState;
    mapping(uint256 => uint256) public trancheOf; // day => haul tranche received from pool
    mapping(uint256 => uint256) public totalWeightOf; // day => sum of settled voyage weights
    mapping(uint256 => uint256) public claimedOf; // day => CLAM already claimed
    mapping(uint256 => bool) public sweptOf; // day => dust returned to pool

    event VoyageStarted(
        uint256 indexed voyageId,
        address indexed player,
        uint256 indexed day,
        uint16 tickerId,
        uint8 partySize
    );
    event VoyageSettled(
        uint256 indexed voyageId, uint256 modifierBps, uint256 weight, uint256 doubloonsEarned
    );
    event VoyageClaimed(uint256 indexed voyageId, uint256 payout);
    event DayReleased(uint256 indexed day, uint256 tranche);
    event DustSwept(uint256 indexed day, uint256 amount);

    constructor(
        IERC20Minimal clam_,
        PearlCreatures creatures_,
        Doubloons doubloons_,
        uint256 genesis_,
        uint256 dayLength_,
        uint256 staleAfter_
    ) {
        require(dayLength_ >= 3, "day too short");
        clam = clam_;
        creatures = creatures_;
        doubloons = doubloons_;
        genesis = genesis_;
        dayLength = dayLength_;
        voyageDuration = dayLength_ / 3;
        staleAfter = staleAfter_;
        ops = msg.sender;
    }

    function setPool(PrizePool pool_) external {
        require(msg.sender == ops && address(pool) == address(0), "pool set once");
        require(address(pool_) != address(0), "zero pool");
        pool = pool_;
    }

    function addTicker(IAggregatorV3 feed, uint8 sector) external {
        require(msg.sender == ops, "ops only");
        require(sector < creatures.NUM_SECTORS(), "bad sector");
        tickers.push(Ticker({feed: feed, sector: sector, live: true}));
    }

    function tickerCount() external view returns (uint256) {
        return tickers.length;
    }

    function voyageCount() external view returns (uint256) {
        return voyages.length;
    }

    function currentDay() public view returns (uint256) {
        return (block.timestamp - genesis) / dayLength;
    }

    function energyUsed(uint256 creatureId) public view returns (uint8) {
        uint256 packed = energyState[creatureId];
        if (packed >> 8 != currentDay()) return 0; // new day, energy refilled
        // casting to 'uint8' is safe because the value is masked to 8 bits
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint8(packed & 0xff);
    }

    /// Pull today's tranche from the pool if not yet done. Public so a keeper can poke
    /// on quiet days and keep the release cadence daily.
    function poke() public {
        uint256 day = currentDay();
        uint256 last = pool.lastReleasedDay();
        if (last == type(uint256).max || day > last) {
            uint256 tranche = pool.release();
            trancheOf[day] = tranche;
            emit DayReleased(day, tranche);
        }
    }

    function startVoyage(uint256[] calldata creatureIds, uint16 tickerId)
        external
        returns (uint256 voyageId)
    {
        require(creatureIds.length >= 1 && creatureIds.length <= C.MAX_PARTY_SIZE, "party size");
        Ticker memory t = tickers[tickerId];
        require(t.live, "dead ticker");
        poke();

        uint256 day = currentDay();
        bool sectorMatch = false;
        for (uint256 i = 0; i < creatureIds.length; i++) {
            uint256 id = creatureIds[i];
            require(creatures.ownerOf(id) == msg.sender, "not yours");
            for (uint256 j = 0; j < i; j++) {
                require(creatureIds[j] != id, "duplicate creature");
            }
            uint256 packed = energyState[id];
            uint256 used = (packed >> 8) == day ? packed & 0xff : 0;
            require(used + C.VOYAGE_ENERGY_COST <= C.ENERGY_PER_DAY, "no energy");
            energyState[id] = (day << 8) | (used + C.VOYAGE_ENERGY_COST);
            if (creatures.sectorOf(id) == t.sector) sectorMatch = true;
        }

        int256 startPrice = _freshTokenPriceUsd(t.feed);
        voyageId = voyages.length;
        voyages.push(
            Voyage({
                player: msg.sender,
                // casting to 'uint32'/'uint40' is safe: day counts and timestamps stay far
                // below 2^32 / 2^40 for any realistic genesis and day length
                // forge-lint: disable-next-line(unsafe-typecast)
                day: uint32(day),
                tickerId: tickerId,
                // forge-lint: disable-next-line(unsafe-typecast)
                endTime: uint40(block.timestamp + voyageDuration),
                startTokenPriceUsd: startPrice,
                partySize: uint8(creatureIds.length),
                sectorMatch: sectorMatch,
                settled: false,
                claimed: false,
                weight: 0
            })
        );
        emit VoyageStarted(voyageId, msg.sender, day, tickerId, uint8(creatureIds.length));
    }

    /// Settle within the day after the voyage's day, so day weights can go final.
    function settle(uint256 voyageId) external {
        Voyage storage v = voyages[voyageId];
        require(!v.settled, "settled");
        // Timestamp comparison is the correct clock on Arbitrum Nitro (block.number is an
        // L1 estimate); sequencer drift is bounded and harmless at voyage granularity.
        // forge-lint: disable-next-line(block-timestamp)
        require(block.timestamp >= v.endTime, "at sea");
        require(currentDay() <= uint256(v.day) + 1, "settle window closed");
        v.settled = true;

        uint256 modifierBps = _modifierBps(v);
        uint256 weight =
            (uint256(v.partySize) * modifierBps * (v.sectorMatch ? C.BPS + C.AFFINITY_BONUS_BPS : C.BPS))
                / C.BPS;
        // casting to 'uint96' is safe: weight <= 3 * 13000 * 11000 / 10000 = 42,900
        // forge-lint: disable-next-line(unsafe-typecast)
        v.weight = uint96(weight);
        totalWeightOf[v.day] += weight;

        uint256 perCreature = C.DOUBLOONS_PER_VOYAGE + (modifierBps > 11_000 ? 5 : 0);
        uint256 earned = perCreature * v.partySize;
        doubloons.credit(v.player, earned);
        emit VoyageSettled(voyageId, modifierBps, weight, earned);
    }

    function claim(uint256 voyageId) external returns (uint256 payout) {
        Voyage storage v = voyages[voyageId];
        require(v.settled && !v.claimed, "not claimable");
        uint256 day = currentDay();
        require(day >= uint256(v.day) + CLAIM_OPEN_AFTER_DAYS, "weights not final");
        require(day <= uint256(v.day) + CLAIM_CLOSE_AFTER_DAYS, "claim window closed");
        v.claimed = true;
        uint256 totalWeight = totalWeightOf[v.day];
        if (totalWeight > 0) {
            payout = (trancheOf[v.day] * uint256(v.weight)) / totalWeight;
        }
        if (payout > 0) {
            claimedOf[v.day] += payout;
            require(clam.transfer(v.player, payout), "transfer");
        }
        emit VoyageClaimed(voyageId, payout);
    }

    /// After the claim window, unclaimed hauls and division dust return to the pool.
    function sweep(uint256 day) external {
        require(currentDay() > day + CLAIM_CLOSE_AFTER_DAYS, "claim window open");
        require(!sweptOf[day], "swept");
        sweptOf[day] = true;
        uint256 dust = trancheOf[day] - claimedOf[day];
        if (dust > 0) {
            require(clam.transfer(address(pool), dust), "transfer");
        }
        emit DustSwept(day, dust);
    }

    /// The canonical price read: full token price in USD (8 decimals), or 0 when stale.
    function _freshTokenPriceUsd(IAggregatorV3 feed) private view returns (int256) {
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        // Staleness must be judged against wall-clock time; a stale read degrades to the
        // base haul rather than reverting, so drift here is not exploitable.
        // forge-lint: disable-next-line(block-timestamp)
        if (answer <= 0 || updatedAt + staleAfter < block.timestamp) return 0;
        return answer;
    }

    function _modifierBps(Voyage storage v) private view returns (uint256) {
        int256 startPrice = v.startTokenPriceUsd;
        if (startPrice == 0) return C.BPS; // stale at start: base haul
        int256 endPrice = _freshTokenPriceUsd(tickers[v.tickerId].feed);
        if (endPrice == 0) return C.BPS; // stale at settlement: base haul
        int256 raw = int256(C.BPS)
            + (int256(C.MODIFIER_AMPLIFICATION) * int256(C.BPS) * (endPrice - startPrice)) / startPrice;
        if (raw < int256(C.MODIFIER_MIN_BPS)) return C.MODIFIER_MIN_BPS;
        if (raw > int256(C.MODIFIER_MAX_BPS)) return C.MODIFIER_MAX_BPS;
        // casting to 'uint256' is safe: raw is clamped to [7000, 13000] above
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint256(raw);
    }
}
