// Chainlink tokenized-equity feed registry for Robinhood Chain mainnet (4663).
// Generated from docs/reference sources captured 2026-08-12; every proxy answered
// latestRoundData() at capture. Re-verify against the Chainlink directory before
// production use - this is a snapshot, not a live source of truth.
//
// All equity feeds: 8 decimals, 86400s heartbeat, 0.5% deviation, market hours us_equities_24/5.
// Read through the proxy with AggregatorV3Interface.latestRoundData(), check answer > 0
// and updatedAt staleness against FEED_HEARTBEAT_SECONDS. Never match feeds by parsing
// description(): the on-chain strings are inconsistent (some "Robinhood X / USD", some "RHX / USD").

export interface EquityFeed {
  /** Ticker of the underlying equity, e.g. "NVDA". */
  symbol: string;
  /** Chainlink directory name of the feed. */
  name: string;
  /** AggregatorV3Interface proxy address on chain 4663. */
  proxy: `0x${string}`;
  /** description() as returned on-chain; informational only, do not key on it. */
  onchainDescription: string;
}

export const FEED_DECIMALS = 8;
export const FEED_HEARTBEAT_SECONDS = 86_400;
export const FEED_DEVIATION_PERCENT = 0.5;

/** The 35 feed-covered tickers. Only these are eligible for voyages and Berths. */
export const EQUITY_FEEDS: readonly EquityFeed[] = [
  {symbol: "AAPL", name: "Robinhood AAPL / USD", proxy: "0x6B22A786bAa607d76728168703a39Ea9C99f2cD0", onchainDescription: "Robinhood AAPL / USD"},
  {symbol: "AMD", name: "Robinhood AMD / USD", proxy: "0x943A29E7ae51A4798823ca9eEd2ed533B2A22C72", onchainDescription: "RHAMD / USD"},
  {symbol: "AMZN", name: "Robinhood AMZN / USD", proxy: "0xD5a1508ceD74c084eBf3cBe853e2C968fB2a651C", onchainDescription: "Robinhood AMZN / USD"},
  {symbol: "ASML", name: "Robinhood ASML / USD", proxy: "0xB4106147E8cce40b7d46124090d373A71b70f87D", onchainDescription: "Robinhood ASML / USD"},
  {symbol: "BABA", name: "Robinhood BABA / USD", proxy: "0x62Cc8F9b5f56a33c9C8A60c8B92779f523c4E984", onchainDescription: "Robinhood BABA / USD"},
  {symbol: "CLSK", name: "Robinhood CLSK / USD", proxy: "0x810c12D3a554Bc47fd39597Fe3b3AAC4941F50eF", onchainDescription: "Robinhood CLSK / USD"},
  {symbol: "COIN", name: "Robinhood COIN / USD", proxy: "0xA3a468A452940B7D6b69991207B508c609a98Ef2", onchainDescription: "Robinhood COIN / USD"},
  {symbol: "CRCL", name: "Robinhood CRCL / USD", proxy: "0x6652eDf64bA3731C4F2D3ce821A0Fb1f1f6b482a", onchainDescription: "Robinhood CRCL / USD"},
  {symbol: "CRWV", name: "Robinhood CRWV / USD", proxy: "0xe1b3aABCAFAd1c94708dc1367dcfF8Aa4407487C", onchainDescription: "Robinhood CRWV / USD"},
  {symbol: "DELL", name: "Robinhood DELL-USD", proxy: "0x1C6c8cADBe02E19129c39dDB92281cE4c0bf206b", onchainDescription: "Robinhood DELL-USD"},
  {symbol: "EWY", name: "Robinhood EWY / USD", proxy: "0xEFdf54610B62A7753Ec30bDc380847c12D32e1D1", onchainDescription: "Robinhood EWY / USD"},
  {symbol: "GME", name: "Robinhood GME / USD", proxy: "0x27C71df6A64fB476468EdF256CF72c038baB5B67", onchainDescription: "Robinhood GME / USD"},
  {symbol: "GOOGL", name: "Robinhood GOOGL / USD", proxy: "0xF6f373a037c30F0e5010d854385cA89185AE638b", onchainDescription: "Robinhood GOOGL / USD"},
  {symbol: "INTC", name: "Robinhood INTC / USD", proxy: "0x3f390C5C24628Ac7C489515402235FeAD71D1913", onchainDescription: "RHINTC / USD"},
  {symbol: "IONQ", name: "Robinhood IONQ / USD", proxy: "0x22EfeC4919baf55F360E0EDee4AbEB26DE4971eb", onchainDescription: "Robinhood IONQ / USD"},
  {symbol: "META", name: "Robinhood META / USD", proxy: "0x7C38C00C30BEe9378381E7B6135d7283356D71b1", onchainDescription: "Robinhood META / USD"},
  {symbol: "MSFT", name: "Robinhood MSFT / USD", proxy: "0x45C3C877C15E6BA2EBB19eA114Ea508d14C1Af2E", onchainDescription: "RHMSFT / USD"},
  {symbol: "MSTR", name: "Robinhood MSTR / USD", proxy: "0x396118bdFB181e6240E74D243F266B061c0edc3D", onchainDescription: "Robinhood MSTR / USD"},
  {symbol: "MU", name: "Robinhood MU / USD", proxy: "0x425EEFdCf05ed6526C3cE61Af99429A228a6d596", onchainDescription: "RHMU / USD"},
  {symbol: "NBIS", name: "Robinhood NBIS / USD", proxy: "0xE1D87B116Ba0fe898998f1D140339D1fA1E09705", onchainDescription: "Robinhood NBIS / USD"},
  {symbol: "NVDA", name: "Robinhood NVDA / USD", proxy: "0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15", onchainDescription: "RHNVDA / USD"},
  {symbol: "ORCL", name: "Robinhood ORCL / USD", proxy: "0x0e6a64a2B58A6693a531E6c555f3A5d042eEA844", onchainDescription: "Robinhood ORCL / USD"},
  {symbol: "PLTR", name: "Robinhood PLTR / USD", proxy: "0x820ABedFF239034956B7A9d2F0a331f9F075eB4c", onchainDescription: "Robinhood PLTR / USD"},
  {symbol: "QQQ", name: "Robinhood QQQ / USD", proxy: "0x80901d846d5D7B030F26B480776EE3b29374C2ae", onchainDescription: "Robinhood QQQ / USD"},
  {symbol: "RGTI", name: "Robinhood RGTI / USD", proxy: "0x2A045cF1C49c61c166C036d2f06FA2D2d984f765", onchainDescription: "Robinhood RGTI / USD"},
  {symbol: "RKLB", name: "Robinhood RKLB / USD", proxy: "0x045477BF65Aef6f4F2386ad0164579e48381CC74", onchainDescription: "Robinhood RKLB / USD"},
  {symbol: "SGOV", name: "Robinhood SGOV-USD", proxy: "0xa0DF4ee0fFf975306345875E3548Fcc519577A11", onchainDescription: "Robinhood SGOV-USD"},
  {symbol: "SLV", name: "Robinhood SLV / USD", proxy: "0x209b73908e92Ae021826eD79609845451Ecba2ce", onchainDescription: "Robinhood SLV / USD"},
  {symbol: "SNDK", name: "Robinhood SNDK / USD", proxy: "0xfb133Fa4B7b385802B693a293606682Df47109A3", onchainDescription: "RHSNDK / USD"},
  {symbol: "SPCX", name: "Robinhood SPCX / USD", proxy: "0xB265810950ba6c5C0Ff821c9963014a56fD8Bffb", onchainDescription: "Robinhood SPCX / USD"},
  {symbol: "SPY", name: "Robinhood SPY / USD", proxy: "0x319724394D3A0e3669269846abE664Cd621f9f6A", onchainDescription: "RHSPY / USD"},
  {symbol: "TSLA", name: "Robinhood TSLA / USD", proxy: "0x4A1166a659A55625345e9515b32adECea5547C38", onchainDescription: "RHTSLA / USD"},
  {symbol: "TSM", name: "Robinhood TSM / USD", proxy: "0x874cF94aa8eC88Fd9560094dD065f2fB3E41Fc2F", onchainDescription: "Robinhood TSM / USD"},
  {symbol: "USAR", name: "Robinhood USAR-USD", proxy: "0xA994d3684e8400A6c8078226925779FdeE682DD9", onchainDescription: "Robinhood USAR-USD"},
  {symbol: "USO", name: "Robinhood USO / USD", proxy: "0x75a9c76Ef439e2C7c2E5a34Ab105EcFe3766431c", onchainDescription: "RHUSO / USD"}
] as const;

export const EQUITY_FEED_BY_SYMBOL: Readonly<Record<string, EquityFeed>> = Object.fromEntries(
  EQUITY_FEEDS.map((f) => [f.symbol, f]),
);

/** Non-equity feeds the protocol may consult (same read pattern, 8 decimals). */
export const USDG_USD_FEED = "0x61B7e5650328764B076A108EFF5fa7282a1B9aD2" as const;
export const ETH_USD_FEED = "0x78F3556b67E17Df817D51Ef5a990cDaF09E8d3A9" as const;
