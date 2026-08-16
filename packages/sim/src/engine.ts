// The Pearl Street economy engine: one deterministic day-tick loop over the full
// economic circuit from docs/ECONOMY.md, with every invariant asserted after every day.
// All CLAM/USDG amounts are integer micro-units (bigint); rounding always favors the protocol.

import {
  BPS,
  CLAM,
  DAILY_RELEASE_BPS,
  DOUBLOONS_PER_VOYAGE,
  FEES_TO_POOL_BPS,
  GEN0_PER_WALLET_CAP,
  GEN0_PRICE_ALLOWLIST,
  GEN0_PRICE_PUBLIC,
  GEN0_SUPPLY,
  GEN1_CAP_PER_SEASON,
  BREED_LIFETIME_LIMIT,
  LEADERBOARD_WINNER_FRACTION,
  MAX_VOYAGES_PER_DAY,
  RELEASE_TO_HAULS_BPS,
  SALE_TO_POOL_BPS,
  SEASON_DAYS,
  VAULT_MINT_FEE_BPS,
  VAULT_REDEEM_FEE_BPS,
} from "./constants.js";
import {makeMarketDay, TICKER_COUNT, voyageModifierBps, type Regime} from "./market.js";
import {fnv1a, mulberry32, randInt, type Rng} from "./rng.js";

export type Archetype = "casual" | "skilled" | "bot" | "whale";

interface ArchetypeParams {
  /** Fraction of the 3-voyage energy ceiling actually used per day. */
  efficiency: number;
  /** Chance a voyage's party sector matches the ticker (+10% affinity bonus). */
  affinityChance: number;
  /** Fraction of each day's gameplay earnings redeemed to USDG the same day. */
  redeemPropensity: number;
}

export const ARCHETYPES: Record<Archetype, ArchetypeParams> = {
  casual: {efficiency: 0.55, affinityChance: 0.15, redeemPropensity: 0},
  skilled: {efficiency: 0.9, affinityChance: 0.6, redeemPropensity: 0.5},
  bot: {efficiency: 1.0, affinityChance: 0.9, redeemPropensity: 0.95},
  whale: {efficiency: 1.0, affinityChance: 0.9, redeemPropensity: 0.9},
};

export interface Player {
  id: number;
  archetype: Archetype;
  clam: bigint;
  creatures: number;
  doubloons: number;
  seasonDoubloons: number;
  cumEarnedClam: bigint;
  cumSpentClam: bigint;
  joinedDay: number;
  active: boolean;
  breedsUsed: number;
  /** Burn-cap tracking: cumulative pool hauls per creature (index-aligned with holdings). */
  creatureHauls: bigint[];
  /** Relics held (from retired creatures); each boosts haul weight of the next team. */
  relics: number;
  /** Re-mint vouchers held (one per retirement); each discounts one re-buy. */
  vouchers: number;
  retirements: number;
  rebuys: number;
  cumLootWon: bigint;
  cumLootLost: bigint;
  cumMarketSpent: bigint;
  /** PEARL earned through play (whole tokens, float is fine: no conservation invariant on it). */
  pearlEarned: number;
  /** USD value of PEARL at the price prevailing when earned. */
  pearlEarnedUsd: number;
}

export interface JoinRequest {
  archetype: Archetype;
  creaturesWanted: number;
}

/** Looting PvP: zero-sum redistribution between players, with a rake to the pool. */
export interface LootingConfig {
  /** Fraction of the day's distributed hauls that gets contested in loot windows. */
  contestedFraction: number;
  /** Rake on every loot transfer, routed as protocol fee (FEES_TO_POOL_BPS to the pool). */
  rakeBps: bigint;
}

/** Marketplace: creature and item churn between players, 5% fee routed as protocol fee. */
export interface MarketplaceConfig {
  /** Daily probability that a skilled/bot/whale player trades one creature-equivalent. */
  dailyTradeChance: Record<Archetype, number>;
  /** Trade price as a fraction of the public mint price. */
  priceFraction: number;
  feeBps: bigint;
}

/** The burn cap: creatures retire at capMultiple x their entry price of lifetime hauls. */
export interface BurnCapConfig {
  capMultiple: number;
  /** Relic boost to haul weight per relic held, in bps; total relic boost is capped. */
  relicBoostBps: number;
  maxRelicBoostBps: number;
  /** Re-mint discount per voucher, in bps of the public price. */
  voucherDiscountBps: bigint;
  /** Chance per day that a player with a spent team re-buys (given they can afford it). */
  rebuyPropensity: Record<Archetype, number>;
}

/**
 * PEARL play rewards. Emission per day = min(schedule, revenueThrottle x trailing-7-day
 * protocol revenue in USD / PEARL price), per docs/TOKENOMICS.md. Market cap fixes the
 * price (cap / circulating); it never changes how many PEARL revenue can justify.
 * Distributed pro-rata to the day's voyage weight; Gen-0 holders get the Founder's Wake bonus.
 */
export interface PearlConfig {
  /** Fully diluted market cap in USD (the scenario knob). */
  marketCapUsd: number;
  hardCap: number;
  /** Fraction of hard cap allocated to play rewards, emitted linearly over scheduleDays. */
  rewardsAllocationFraction: number;
  scheduleDays: number;
  /** k in min(schedule, k x trailing-7-day revenue). */
  revenueThrottle: number;
  /** Founder's Wake: bonus on play-earned PEARL for Gen-0 holders. */
  foundersWakeBps: number;
  /** Fraction of earned PEARL players sell (adds to "earned" in USD, not modeled as price impact). */
  sellFraction: Record<Archetype, number>;
  /**
   * Protocol-owned LP revenue from PEARL trading (the recurring source, user 2026-08-15):
   * daily volume = marketCap x dailyVolumeFraction; protocol earns lpFeeBps x poolShare
   * of it as revenue, which enters the throttle window like every other revenue.
   */
  trading?: {
    /** Daily volume as a fraction of market cap; ignored when dailyVolumeUsd is set. */
    dailyVolumeFraction?: number;
    /** Absolute daily volume in USD (the user's scenario knob, 2026-08-15). */
    dailyVolumeUsd?: number;
    lpFeeBps: number;
    protocolPoolShare: number;
  };
}

export interface ScenarioConfig {
  name: string;
  seed: number;
  days: number;
  regimeForDay: (day: number) => Regime;
  joins: (day: number, state: State, rng: Rng) => JoinRequest[];
  /** Fraction of active players leaving today (leavers redeem everything). */
  leaveFraction: (day: number, state: State, rng: Rng) => number;
  breedingEnabled?: boolean;
  /** Whales run many wallets, so the per-wallet mint cap does not bind them. */
  sybilWhales?: boolean;
  staleChance?: number;
  /** Optional post-launch features; absent means launch scope only. */
  looting?: LootingConfig;
  marketplace?: MarketplaceConfig;
  burnCap?: BurnCapConfig;
  /** Override the 80/20 hauls/leaderboard split (bps to hauls). */
  haulsSplitBps?: bigint;
  pearl?: PearlConfig;
}

export interface DayMetrics {
  day: number;
  regime: Regime;
  poolStart: bigint;
  poolEnd: bigint;
  release: bigint;
  haulsDistributed: bigint;
  leaderboardPot: bigint;
  activePlayers: number;
  activeCreatures: number;
  voyages: number;
  perCreatureYield: bigint;
  feeToPool: bigint;
  redeemedUsdg: bigint;
  cohort0Earned: bigint;
  cohort0Spent: bigint;
  cohort0Creatures: number;
  whalePayoutShare: number;
  whaleWeightShare: number;
  lootMoved: bigint;
  marketVolume: bigint;
  retirementsToday: number;
  rebuysToday: number;
  pearlEmitted: number;
  pearlPriceUsd: number;
  /** Protocol revenue recognized today (all fees + sale proceeds to ops), in micro-CLAM. */
  revenueToday: bigint;
}

export interface State {
  day: number;
  season: number;
  pool: bigint;
  leaderboardPot: bigint;
  treasuryOps: bigint;
  treasuryFees: bigint;
  vaultReserve: bigint;
  clamSupply: bigint;
  players: Player[];
  gen0Minted: number;
  gen1Total: number;
  gen1MintedThisSeason: number;
  idleCreatures: number;
  cumPoolInflow: bigint;
  cumGameplayPaid: bigint;
  cumFeeToPool: bigint;
  cumRedeemedUsdg: bigint;
  cumLootMoved: bigint;
  cumMarketVolume: bigint;
  cumRetirements: number;
  cumRebuys: number;
  cumRebuyClam: bigint;
  cumPearlEmitted: number;
  /** Trailing revenue window for the PEARL throttle (micro-CLAM per day). */
  revenueWindow: bigint[];
  cumRevenue: bigint;
  /** PEARL trading-fee revenue (USD in micro units), a subset of cumRevenue. */
  cumTradingRevenue: bigint;
  metrics: DayMetrics[];
}

const CREDIT_REASONS = new Set(["vault-mint", "haul", "leaderboard", "secondary-sale", "loot-won"]);

function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

function creditClam(player: Player, amount: bigint, reason: string): void {
  if (!CREDIT_REASONS.has(reason)) {
    throw new Error(`invariant: CLAM credited from disallowed source "${reason}"`);
  }
  if (amount < 0n) throw new Error("invariant: negative CLAM credit");
  player.clam += amount;
}

export function initialState(): State {
  return {
    day: 0,
    season: 1,
    pool: 0n,
    leaderboardPot: 0n,
    treasuryOps: 0n,
    treasuryFees: 0n,
    vaultReserve: 0n,
    clamSupply: 0n,
    players: [],
    gen0Minted: 0,
    gen1Total: 0,
    gen1MintedThisSeason: 0,
    idleCreatures: 0,
    cumPoolInflow: 0n,
    cumGameplayPaid: 0n,
    cumFeeToPool: 0n,
    cumRedeemedUsdg: 0n,
    cumLootMoved: 0n,
    cumMarketVolume: 0n,
    cumRetirements: 0,
    cumRebuys: 0,
    cumRebuyClam: 0n,
    cumPearlEmitted: 0,
    revenueWindow: [],
    cumRevenue: 0n,
    cumTradingRevenue: 0n,
    metrics: [],
  };
}

/** Route protocol fee revenue by FEES_TO_POOL_BPS (100% to the active season pool; treasury leg kept for the constant). */
function routeFee(state: State, feeClam: bigint): bigint {
  state.cumRevenue += feeClam;
  const toPool = (feeClam * FEES_TO_POOL_BPS) / BPS;
  state.pool += toPool;
  state.treasuryFees += feeClam - toPool;
  state.cumPoolInflow += toPool;
  state.cumFeeToPool += toPool;
  return toPool;
}

/** Vault mint: deposit USDG 1:1, 1% fee skimmed in CLAM at the edge, reserve == supply always. */
function vaultMint(state: State, player: Player, usdgIn: bigint): bigint {
  const fee = ceilDiv(usdgIn * VAULT_MINT_FEE_BPS, BPS);
  state.vaultReserve += usdgIn;
  state.clamSupply += usdgIn;
  routeFee(state, fee);
  const out = usdgIn - fee;
  creditClam(player, out, "vault-mint");
  return out;
}

/** Vault redeem: 1% fee skimmed in CLAM, the rest burned against an equal USDG payout. */
function vaultRedeem(state: State, clamIn: bigint): bigint {
  const fee = ceilDiv(clamIn * VAULT_REDEEM_FEE_BPS, BPS);
  const burn = clamIn - fee;
  if (state.vaultReserve < burn) throw new Error("invariant: vault reserve underflow on redeem");
  state.vaultReserve -= burn;
  state.clamSupply -= burn;
  routeFee(state, fee);
  state.cumRedeemedUsdg += burn;
  return burn;
}

function gen0Price(state: State): bigint {
  // First 1,500 creatures at the allowlist price, the rest public; this mix reproduces
  // the documented ~720,000 USDG max raise at sellout.
  return state.gen0Minted < 1_500 ? GEN0_PRICE_ALLOWLIST : GEN0_PRICE_PUBLIC;
}

function joinPlayer(state: State, req: JoinRequest, config: ScenarioConfig): void {
  const player: Player = {
    id: state.players.length,
    archetype: req.archetype,
    clam: 0n,
    creatures: 0,
    doubloons: 0,
    seasonDoubloons: 0,
    cumEarnedClam: 0n,
    cumSpentClam: 0n,
    joinedDay: state.day,
    active: true,
    breedsUsed: 0,
    creatureHauls: [],
    relics: 0,
    vouchers: 0,
    retirements: 0,
    rebuys: 0,
    cumLootWon: 0n,
    cumLootLost: 0n,
    cumMarketSpent: 0n,
    pearlEarned: 0,
    pearlEarnedUsd: 0,
  };
  state.players.push(player);

  const capBound =
    req.archetype === "whale" && config.sybilWhales ? req.creaturesWanted : GEN0_PER_WALLET_CAP;
  let wanted = Math.min(req.creaturesWanted, capBound);

  // Primary sale while Gen-0 supply lasts.
  while (wanted > 0 && state.gen0Minted < GEN0_SUPPLY) {
    const price = gen0Price(state);
    const deposit = ceilDiv(price * BPS, BPS - VAULT_MINT_FEE_BPS);
    vaultMint(state, player, deposit);
    player.cumSpentClam += deposit;
    if (player.clam < price) throw new Error("sim bug: mint under-funded a Gen-0 purchase");
    player.clam -= price;
    const toPool = (price * SALE_TO_POOL_BPS) / BPS;
    state.pool += toPool;
    state.cumPoolInflow += toPool;
    state.treasuryOps += price - toPool;
    state.cumRevenue += price - toPool;
    state.gen0Minted += 1;
    player.creatures += 1;
    player.creatureHauls.push(0n);
    wanted -= 1;
  }

  // Secondary market after sellout: buy idle creatures from exited players at the public
  // price; the seller redeems immediately, so the protocol sees mint and redeem fees only.
  while (wanted > 0 && state.idleCreatures > 0) {
    const price = GEN0_PRICE_PUBLIC;
    const deposit = ceilDiv(price * BPS, BPS - VAULT_MINT_FEE_BPS);
    vaultMint(state, player, deposit);
    player.cumSpentClam += deposit;
    player.clam -= price;
    vaultRedeem(state, price);
    state.idleCreatures -= 1;
    player.creatures += 1;
    player.creatureHauls.push(0n);
    wanted -= 1;
  }

  // A joiner who could not obtain a single creature leaves immediately (demand unmet).
  if (player.creatures === 0) {
    if (player.clam > 0n) {
      vaultRedeem(state, player.clam);
      player.clam = 0n;
    }
    player.active = false;
  }
}

function runBreeding(state: State, rng: Rng): void {
  if (state.season < 2) return;
  for (const p of state.players) {
    if (!p.active) continue;
    if (p.archetype !== "skilled" && p.archetype !== "whale") continue;
    if (state.gen1MintedThisSeason >= GEN1_CAP_PER_SEASON) break;
    if (p.breedsUsed >= p.creatures * BREED_LIFETIME_LIMIT) continue;
    // Escalating cost per breed already used: 50 CLAM base +25% per prior breed, plus Doubloons.
    const clamCost = (50n * CLAM * (100n + 25n * BigInt(p.breedsUsed))) / 100n;
    const doubloonCost = 3_000 * (1 + p.breedsUsed);
    if (p.clam < clamCost || p.doubloons < doubloonCost) continue;
    if (rng() > 0.1) continue; // breeding trickles in rather than bursting
    p.clam -= clamCost;
    routeFee(state, clamCost); // breeding CLAM is protocol fee revenue
    p.doubloons -= doubloonCost;
    p.creatures += 1;
    p.breedsUsed += 1;
    state.gen1Total += 1;
    state.gen1MintedThisSeason += 1;
  }
}

/**
 * Looting PvP: a fraction of today's hauls is contested. Each contested voyage is looted
 * with probability proportional to how much better the looter played (weight per creature);
 * loot moves from victim to looter minus a rake routed as protocol fee. Zero-sum plus rake:
 * total player CLAM only decreases by the rake, which refills the pool.
 */
function runLooting(
  state: State,
  cfg: LootingConfig,
  voyagers: Player[],
  weights: number[],
  haulsTranche: bigint,
  totalWeight: number,
  rng: Rng,
): bigint {
  let moved = 0n;
  const skill = voyagers.map((p, i) => weights[i] / Math.max(1, p.creatures));
  const meanSkill = skill.reduce((s, v) => s + v, 0) / skill.length;
  for (let i = 0; i < voyagers.length; i++) {
    const victim = voyagers[i];
    // Everyone's hauls are exposed; the contested amount is a fraction of today's payout.
    const payout = (haulsTranche * BigInt(weights[i])) / BigInt(totalWeight);
    const contested = (payout * BigInt(Math.round(cfg.contestedFraction * 10_000))) / BPS;
    if (contested === 0n || victim.clam < contested) continue;
    // Pick a looter; success chance rises with looter skill and falls with victim skill.
    const j = randInt(rng, voyagers.length);
    if (j === i) continue;
    const looter = voyagers[j];
    const edge = (skill[j] - skill[i]) / (meanSkill || 1);
    const successChance = Math.min(0.9, Math.max(0.1, 0.5 + edge));
    if (rng() >= successChance) continue;
    const rake = ceilDiv(contested * cfg.rakeBps, BPS);
    victim.clam -= contested;
    victim.cumLootLost += contested;
    routeFee(state, rake);
    creditClam(looter, contested - rake, "loot-won");
    looter.cumLootWon += contested - rake;
    // Loot counts as gameplay earnings for payback accounting, not for the burn cap.
    looter.cumEarnedClam += contested - rake;
    moved += contested;
  }
  state.cumLootMoved += moved;
  return moved;
}

/**
 * Marketplace churn: active traders buy a creature-equivalent from another player at a
 * fraction of mint price; the fee is protocol revenue. Creature counts are unchanged in
 * aggregate (a transfer), so this models the FEE FLOW of trading, not supply changes.
 */
function runMarketplace(state: State, cfg: MarketplaceConfig, rng: Rng): bigint {
  const active = state.players.filter((p) => p.active && p.creatures > 0);
  if (active.length < 2) return 0n;
  let volume = 0n;
  const price = (GEN0_PRICE_PUBLIC * BigInt(Math.round(cfg.priceFraction * 10_000))) / BPS;
  for (const buyer of active) {
    if (rng() >= cfg.dailyTradeChance[buyer.archetype]) continue;
    if (buyer.clam < price) continue;
    const seller = active[randInt(rng, active.length)];
    if (seller === buyer || seller.creatures <= 1) continue;
    const fee = ceilDiv(price * cfg.feeBps, BPS);
    buyer.clam -= price;
    buyer.cumMarketSpent += price;
    routeFee(state, fee);
    creditClam(seller, price - fee, "secondary-sale");
    // Transfer the creature and its cap tracker (cap is per creature, on the token).
    const tracker = seller.creatureHauls.pop() ?? 0n;
    seller.creatures -= 1;
    buyer.creatures += 1;
    buyer.creatureHauls.push(tracker);
    volume += price;
  }
  state.cumMarketVolume += volume;
  return volume;
}

/**
 * The burn cap: any creature whose lifetime pool hauls reach capMultiple x the public
 * mint price retires: it leaves the yield base, the owner gains a relic (haul-weight boost
 * on future voyages) and a voucher (discount on the next re-buy). Re-buys pay the public
 * price minus voucher discount into the sale split (30% pool / 70% ops) as new money.
 */
function runBurnCap(state: State, cfg: BurnCapConfig, rng: Rng): {retirements: number; rebuys: number} {
  let retirements = 0;
  let rebuys = 0;
  const cap = (GEN0_PRICE_PUBLIC * BigInt(Math.round(cfg.capMultiple * 10_000))) / BPS;
  for (const p of state.players) {
    if (!p.active) continue;
    // Retirements.
    for (let c = p.creatureHauls.length - 1; c >= 0; c--) {
      if (p.creatureHauls[c] < cap) continue;
      p.creatureHauls.splice(c, 1);
      p.creatures -= 1;
      p.relics += 1;
      p.vouchers += 1;
      p.retirements += 1;
      retirements += 1;
    }
    // Re-buys: a player whose team shrank below what they want tops back up if they can pay.
    const targetTeam = Math.max(3, p.retirements > 0 ? Math.min(GEN0_PER_WALLET_CAP, p.creatures + p.vouchers) : 0);
    while (p.creatures < targetTeam && p.vouchers > 0) {
      if (rng() >= cfg.rebuyPropensity[p.archetype]) break;
      const discount = (GEN0_PRICE_PUBLIC * cfg.voucherDiscountBps) / BPS;
      const price = GEN0_PRICE_PUBLIC - discount;
      // Players who hold enough CLAM pay from balance; others top up through the vault
      // (bringing new USDG in), mirroring how the sale is funded.
      if (p.clam < price) {
        const shortfall = price - p.clam;
        const deposit = ceilDiv(shortfall * BPS, BPS - VAULT_MINT_FEE_BPS);
        vaultMint(state, p, deposit);
        p.cumSpentClam += deposit;
      }
      p.clam -= price;
      p.vouchers -= 1;
      const toPool = (price * SALE_TO_POOL_BPS) / BPS;
      state.pool += toPool;
      state.cumPoolInflow += toPool;
      state.treasuryOps += price - toPool;
      state.cumRevenue += price - toPool;
      p.creatures += 1;
      p.creatureHauls.push(0n);
      p.rebuys += 1;
      rebuys += 1;
      state.cumRebuyClam += price;
    }
  }
  state.cumRetirements += retirements;
  state.cumRebuys += rebuys;
  return {retirements, rebuys};
}

function runPearl(
  state: State,
  cfg: PearlConfig,
  voyagers: Player[],
  weights: number[],
  totalWeight: number,
): {emitted: number; priceUsd: number} {
  // Price is fixed by the scenario's market cap over the hard cap (fully diluted).
  const priceUsd = cfg.marketCapUsd / cfg.hardCap;
  const scheduleDaily = (cfg.hardCap * cfg.rewardsAllocationFraction) / cfg.scheduleDays;
  const trailingRevenueUsd = Number(state.revenueWindow.reduce((s, v) => s + v, 0n)) / Number(CLAM);
  const throttleDaily = (cfg.revenueThrottle * trailingRevenueUsd) / priceUsd / 7;
  const emitted = Math.min(scheduleDaily, throttleDaily);
  if (emitted <= 0) return {emitted: 0, priceUsd};
  for (let i = 0; i < voyagers.length; i++) {
    const p = voyagers[i];
    let share = (emitted * weights[i]) / totalWeight;
    if (p.joinedDay === 0) share *= 1 + cfg.foundersWakeBps / 10_000; // Gen-0 = launch cohort
    p.pearlEarned += share;
    p.pearlEarnedUsd += share * priceUsd;
  }
  state.cumPearlEmitted += emitted;
  return {emitted, priceUsd};
}

function settleLeaderboard(state: State): void {
  const ranked = state.players
    .filter((p) => p.active && p.seasonDoubloons > 0)
    .sort((a, b) => b.seasonDoubloons - a.seasonDoubloons || a.id - b.id);
  const winners = ranked.slice(0, Math.max(1, Math.ceil(ranked.length * LEADERBOARD_WINNER_FRACTION)));
  const totalScore = winners.reduce((s, p) => s + p.seasonDoubloons, 0);
  if (totalScore > 0 && state.leaderboardPot > 0n) {
    const pot = state.leaderboardPot;
    let paid = 0n;
    for (const w of winners) {
      const share = (pot * BigInt(w.seasonDoubloons)) / BigInt(totalScore);
      creditClam(w, share, "leaderboard");
      w.cumEarnedClam += share;
      paid += share;
    }
    // Division dust stays in the pot for next season. The pot was already counted in
    // cumGameplayPaid when it left the pool, so paying it out is not counted again.
    state.leaderboardPot -= paid;
  }
  for (const p of state.players) p.seasonDoubloons = 0;
  state.season += 1;
  state.gen1MintedThisSeason = 0;
}

function assertInvariants(state: State, poolStart: bigint, release: bigint): void {
  if (state.pool < 0n) throw new Error("invariant: pool balance negative");
  if (state.leaderboardPot < 0n) throw new Error("invariant: leaderboard pot negative");
  if (state.treasuryOps < 0n || state.treasuryFees < 0n) {
    throw new Error("invariant: treasury negative");
  }
  const cap = (poolStart * DAILY_RELEASE_BPS) / BPS;
  if (release > cap) throw new Error("invariant: daily release exceeded the 1.5% cap");
  if (state.vaultReserve !== state.clamSupply) {
    throw new Error(
      `invariant: vault reserve ${state.vaultReserve} != CLAM supply ${state.clamSupply}`,
    );
  }
  let held = state.pool + state.leaderboardPot + state.treasuryOps + state.treasuryFees;
  for (const p of state.players) {
    if (p.clam < 0n) throw new Error("invariant: player CLAM balance negative");
    if (p.doubloons < 0) throw new Error("invariant: player Doubloon balance negative");
    held += p.clam;
  }
  if (held !== state.clamSupply) {
    throw new Error(`invariant: CLAM conservation broken (held ${held}, supply ${state.clamSupply})`);
  }
  if (state.cumGameplayPaid > state.cumPoolInflow) {
    throw new Error("invariant: gameplay paid out more than was ever paid into the pool");
  }
}

export function runDay(state: State, config: ScenarioConfig, rng: Rng): void {
  const day = state.day;
  const revenueStart = state.cumRevenue;
  const regime = config.regimeForDay(day);
  const market = makeMarketDay(regime, day, rng, config.staleChance ?? 0.02);
  let feeToPoolToday = state.cumFeeToPool;
  let redeemedStart = state.cumRedeemedUsdg;

  // 1. Population: joins, then leavers (leavers redeem everything, creatures go idle).
  for (const req of config.joins(day, state, rng)) joinPlayer(state, req, config);
  const leaveFrac = config.leaveFraction(day, state, rng);
  if (leaveFrac > 0) {
    const active = state.players.filter((p) => p.active);
    const leavers = Math.floor(active.length * leaveFrac);
    for (let i = 0; i < leavers; i++) {
      const p = active[randInt(rng, active.length)];
      if (!p.active) continue;
      if (p.clam > 0n) {
        vaultRedeem(state, p.clam);
        p.clam = 0n;
      }
      state.idleCreatures += p.creatures;
      p.creatures = 0;
      p.creatureHauls = [];
      p.active = false;
    }
  }

  // 2. Daily pool release: at most 1.5% of the current balance, 80/20 hauls/leaderboard.
  const poolStart = state.pool;
  const release = (poolStart * DAILY_RELEASE_BPS) / BPS;
  const haulsTranche = (release * (config.haulsSplitBps ?? RELEASE_TO_HAULS_BPS)) / BPS;
  const toLeaderboard = release - haulsTranche;
  state.pool -= release;
  state.leaderboardPot += toLeaderboard;
  state.cumGameplayPaid += toLeaderboard;

  // 3. Voyages: energy-capped, modifier-weighted shares of the haul tranche.
  const weights: number[] = [];
  const voyagers: Player[] = [];
  let totalWeight = 0;
  let voyageCount = 0;
  let whaleWeight = 0;
  for (const p of state.players) {
    if (!p.active || p.creatures === 0) continue;
    const params = ARCHETYPES[p.archetype];
    const ideal = p.creatures * MAX_VOYAGES_PER_DAY * params.efficiency;
    let voyages = Math.floor(ideal);
    if (rng() < ideal - voyages) voyages += 1;
    let weight = 0;
    for (let v = 0; v < voyages; v++) {
      const modBps = voyageModifierBps(market, randInt(rng, TICKER_COUNT), rng);
      const effectiveMod = modBps === null ? 10_000n : modBps;
      const affinity = rng() < params.affinityChance ? 11_000n : 10_000n;
      let voyageWeight = Number((effectiveMod * affinity) / 10_000n);
      if (config.burnCap && p.relics > 0) {
        const boost = Math.min(config.burnCap.maxRelicBoostBps, p.relics * config.burnCap.relicBoostBps);
        voyageWeight = Math.floor((voyageWeight * (10_000 + boost)) / 10_000);
      }
      weight += voyageWeight;
      let doubloons = DOUBLOONS_PER_VOYAGE;
      if (effectiveMod > 11_000n) doubloons += 5; // performance bonus
      p.doubloons += doubloons;
      p.seasonDoubloons += doubloons;
    }
    voyageCount += voyages;
    if (weight > 0) {
      weights.push(weight);
      voyagers.push(p);
      totalWeight += weight;
      if (p.archetype === "whale") whaleWeight += weight;
    }
  }

  let haulsDistributed = 0n;
  let whalePaid = 0n;
  if (totalWeight > 0) {
    const totalW = BigInt(totalWeight);
    for (let i = 0; i < voyagers.length; i++) {
      const payout = (haulsTranche * BigInt(weights[i])) / totalW;
      creditClam(voyagers[i], payout, "haul");
      voyagers[i].cumEarnedClam += payout;
      if (config.burnCap) {
        const per = payout / BigInt(voyagers[i].creatures);
        for (let c = 0; c < voyagers[i].creatureHauls.length; c++) voyagers[i].creatureHauls[c] += per;
      }
      haulsDistributed += payout;
      if (voyagers[i].archetype === "whale") whalePaid += payout;
    }
  }
  // Division dust, and the whole tranche when nobody voyaged, returns to the pool.
  const dust = haulsTranche - haulsDistributed;
  state.pool += dust;
  state.cumPoolInflow += dust;
  state.cumGameplayPaid += haulsDistributed;

  // 3b. Post-launch features (opt-in per scenario): looting, marketplace, burn cap.
  let lootMoved = 0n;
  let marketVolume = 0n;
  let retirementsToday = 0;
  let rebuysToday = 0;
  if (config.looting && voyagers.length > 1) lootMoved = runLooting(state, config.looting, voyagers, weights, haulsTranche, totalWeight, rng);
  if (config.marketplace) marketVolume = runMarketplace(state, config.marketplace, rng);
  if (config.burnCap) ({retirements: retirementsToday, rebuys: rebuysToday} = runBurnCap(state, config.burnCap, rng));

  // 3c. PEARL play rewards (opt-in): revenue-throttled emission, pro-rata by voyage weight.
  let pearlEmitted = 0;
  let pearlPriceUsd = 0;
  if (config.pearl?.trading) {
    // Trading fees are USD revenue held by the protocol; recognized here so they enter
    // the throttle window. They are outside the CLAM circuit (no CLAM minted for them).
    const t = config.pearl.trading;
    const volumeUsd = t.dailyVolumeUsd ?? config.pearl.marketCapUsd * (t.dailyVolumeFraction ?? 0);
    const feeUsd = (volumeUsd * t.lpFeeBps * t.protocolPoolShare) / 10_000;
    state.cumRevenue += BigInt(Math.round(feeUsd * Number(CLAM)));
    state.cumTradingRevenue += BigInt(Math.round(feeUsd * Number(CLAM)));
  }
  const revenueToday = state.cumRevenue - revenueStart;
  state.revenueWindow.push(revenueToday);
  if (state.revenueWindow.length > 7) state.revenueWindow.shift();
  if (config.pearl && totalWeight > 0) {
    ({emitted: pearlEmitted, priceUsd: pearlPriceUsd} = runPearl(state, config.pearl, voyagers, weights, totalWeight));
  }

  // 4. Extractors redeem a slice of today's earnings (vault redeem fee refills the pool).
  for (let i = 0; i < voyagers.length; i++) {
    const p = voyagers[i];
    const propensity = ARCHETYPES[p.archetype].redeemPropensity;
    if (propensity === 0) continue;
    const earnedToday = (haulsTranche * BigInt(weights[i])) / BigInt(totalWeight);
    const toRedeem = (earnedToday * BigInt(Math.round(propensity * 10_000))) / BPS;
    const amount = toRedeem < p.clam ? toRedeem : p.clam;
    if (amount > 0n) {
      vaultRedeem(state, amount);
      p.clam -= amount;
    }
  }

  // 5. Breeding (season 2+, Gen-1 cap per season) and season rollover.
  if (config.breedingEnabled) runBreeding(state, rng);
  if ((day + 1) % SEASON_DAYS === 0) settleLeaderboard(state);

  // 6. Invariants and metrics.
  assertInvariants(state, poolStart, release);
  let activePlayers = 0;
  let activeCreatures = 0;
  let cohort0Earned = 0n;
  let cohort0Spent = 0n;
  let cohort0Creatures = 0;
  for (const p of state.players) {
    if (p.active) {
      activePlayers += 1;
      activeCreatures += p.creatures;
    }
    if (p.joinedDay === 0) {
      cohort0Earned += p.cumEarnedClam;
      cohort0Spent += p.cumSpentClam;
      if (p.active) cohort0Creatures += p.creatures;
    }
  }
  state.metrics.push({
    day,
    regime,
    poolStart,
    poolEnd: state.pool,
    release,
    haulsDistributed,
    leaderboardPot: state.leaderboardPot,
    activePlayers,
    activeCreatures,
    voyages: voyageCount,
    perCreatureYield: activeCreatures > 0 ? haulsDistributed / BigInt(activeCreatures) : 0n,
    feeToPool: state.cumFeeToPool - feeToPoolToday,
    redeemedUsdg: state.cumRedeemedUsdg - redeemedStart,
    cohort0Earned,
    cohort0Spent,
    cohort0Creatures,
    whalePayoutShare: haulsDistributed > 0n ? Number(whalePaid) / Number(haulsDistributed) : 0,
    whaleWeightShare: totalWeight > 0 ? whaleWeight / totalWeight : 0,
    lootMoved,
    marketVolume,
    retirementsToday,
    rebuysToday,
    pearlEmitted,
    pearlPriceUsd,
    revenueToday,
  });
  state.day += 1;
}

export interface RunResult {
  state: State;
  metrics: DayMetrics[];
  fingerprint: string;
}

export function runScenario(config: ScenarioConfig): RunResult {
  const rng = mulberry32(config.seed);
  const state = initialState();
  for (let day = 0; day < config.days; day++) runDay(state, config, rng);
  const fingerprint = fnv1a(
    JSON.stringify(state.metrics, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
  return {state, metrics: state.metrics, fingerprint};
}
