# Robinhood Chain and Stock Tokens: Master Reference

One standing reference for every Robinhood Chain project.
Synthesized from all 26 official documentation pages plus 3 linked sub-pages, then verified against mainnet.

**Compiled:** 2026-08-12.
**Sources:** `robinhood-chain/` holds a verbatim archive of every page, one file per URL.
**Verification:** `robinhood-chain/31-onchain-verification.md` records what was read directly from chain, and where the docs and reality diverge.

Values that move (prices, supply, multipliers, gas) are point-in-time snapshots.
Addresses, interfaces, and architecture are stable and are the reason this document exists.

---

## 1. What Robinhood Chain is

A permissionless, EVM-compatible Layer 2 built on **Arbitrum Dedicated Blockchains** (Arbitrum Nitro), settling to Ethereum, using **Ethereum blobs for data availability** and **ETH as the native gas token**.
It is purpose-built for tokenized real-world assets: equities, ETFs, and other financial instruments.

The flagship asset class is **Robinhood Stock Tokens**, ERC-20 tokens giving economic exposure to US equities and ETFs, issued by Robinhood Assets (Jersey) Limited.

Two design choices set it apart from a generic L2:

**First-come, first-served sequencing.**
Ordering is strictly by arrival time at the sequencer.
There are no priority gas auctions, and paying more will not move you ahead in the queue.
Any MEV strategy that assumes fee-based reordering does not transfer to this chain.

**Sequencer-level compliance screening.**
Transactions associated with sanctioned addresses are excluded from inclusion at the sequencer.
A blocked transfer is never processed, so it appears as though the event never occurred, which keeps indexers consistent with actual state.
Read operations (`eth_call`, `eth_getLogs`, balance queries) are unaffected.
This is a real behavioural difference: a transaction can be silently dropped rather than reverted, so do not build flows that assume every submitted transaction eventually lands or fails visibly.

## 2. Network connection

| Property | Mainnet | Testnet |
| --- | --- | --- |
| Chain ID | **4663** (`0x1237`) | **46630** |
| Native currency | ETH | ETH |
| Public RPC | `https://rpc.mainnet.chain.robinhood.com` | `https://rpc.testnet.chain.robinhood.com` |
| Sequencer feed | `wss://feed.mainnet.chain.robinhood.com` | `wss://feed.testnet.chain.robinhood.com` |
| Sequencer | `https://sequencer.mainnet.chain.robinhood.com` | `https://sequencer.testnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` | `https://explorer.testnet.chain.robinhood.com` |
| Status page | `http://status.robinhoodchain.offchain.io/` | - |

Public endpoints are rate-limited and explicitly not for production.

**Providers.** Alchemy is the recommended provider and supplies the RPC, Data API, and gasless transaction infrastructure.

| Endpoint | Mainnet | Testnet |
| --- | --- | --- |
| Alchemy RPC | `https://robinhood-mainnet.g.alchemy.com/v2/{API_KEY}` | `https://robinhood-testnet.g.alchemy.com/v2/{API_KEY}` |
| Alchemy WSS | `wss://robinhood-mainnet.g.alchemy.com/v2/{API_KEY}` | `wss://robinhood-testnet.g.alchemy.com/v2/{API_KEY}` |
| QuickNode | `https://{ENDPOINT}.robinhood-mainnet.quiknode.pro/{TOKEN}` | - |

Also supported: Blockdaemon, dRPC, Validation Cloud.
Historical reads and pinned fork tests need an **archive** endpoint, since public endpoints prune state after roughly 5,000 blocks.

**Verified at block 34,251,364 on 2026-08-12:** client `nitro/v3.11.2`, observed block time ~0.1 s, gas price ~0.0426 gwei, block gas limit 2^50 (the Arbitrum sentinel value, not a real budget).

## 3. Differences from Ethereum that will bite you

Contracts deploy unmodified, but Nitro semantics differ in ways that cause silent bugs.

| Behaviour | On Robinhood Chain | What to do |
| --- | --- | --- |
| `block.number` | Returns an estimate of the **L1** block number, updated only periodically | Use `ArbSys(0x64).arbBlockNumber()` for the real L2 height |
| `block.prevrandao` / `block.difficulty` | Constant | Never use for randomness; use Chainlink VRF |
| `blockhash(n)` | Reliable only for recent blocks | Do not use for old blocks or randomness |
| `block.coinbase` | Network fee account, not a validator | Do not treat as a miner address |
| `gasleft()` and gas estimation | Differ because fees have an L1 data component | Query pricing via `ArbGasInfo`; do not hardcode gas |
| `msg.sender` from L1 | **Aliased** L1 address (original plus fixed offset) | Apply/undo alias in access control; use SDK `applyAlias` |
| Max contract size | **96 KB** code, 192 KB init code (vs 24 KB on Ethereum) | Contracts too big for Ethereum can deploy here |
| Transaction ordering | First-come, first-served | Fee bumping does not reprioritize |
| Inclusion | Sanctioned-address transactions silently excluded | Do not assume every submitted tx resolves |

Full detail in `robinhood-chain/12-differences-from-ethereum.md`.

## 4. Gas, fees, and finality

A fee has two components, both bundled into the gas your transaction pays:

- **L2 execution fee**, gas used times L2 gas price. Low and stable.
- **L1 data fee**, the cost of posting calldata to Ethereum. Varies with Ethereum congestion and scales with calldata size.

Standard estimation (`eth_estimateGas`, wallet previews) accounts for both.
Because the L1 component scales with calldata, the highest-leverage optimization is **shrinking calldata**: pack arguments tightly, drop unnecessary data, and batch operations.

**Finality is staged.**

| Stage | Latency | Guarantee |
| --- | --- | --- |
| Soft confirmation (sequencer) | Sub-second | Sequencer committed to inclusion and ordering; reversible only if it posts a different order |
| Posted to Ethereum L1 Inbox | Minutes | Ordering fixed; reorg only if Ethereum reorgs |
| Ethereum finality | ~13 min after posting | Irreversible, inherits Ethereum security |

Use soft confirmations for everyday UX.
Wait for L1 posting or full finality for high-value or irreversible actions.

**Withdrawal delay is separate from finality.**
Moving assets back to Ethereum through the canonical bridge takes a **7-day challenge period**, a requirement of Arbitrum's fraud-proof system.

## 5. Bridging

| Route | Type | Speed | Best for |
| --- | --- | --- | --- |
| Arbitrum canonical bridge | Trustless L1 to L2 | Deposit ~10 min, withdrawal ~7 days | Trust-minimized ETH and ERC-20 movement |
| LayerZero OFT / Stargate | Omnichain token transfer | Minutes | WBTC, USDG, other OFTs |
| Chainlink CCIP / Transporter | Messaging plus token transfer | Minutes | Bridge-and-act flows |
| Relay | Intents | Seconds | Fast transfers, bridge-and-execute |
| Across | Intents | Seconds | Fast, capital-efficient |
| LiFi / 0x | Aggregators | Seconds to minutes | Swap-and-bridge in one step |

Withdrawing is three steps: initiate on L2, wait the 7-day challenge period, then **claim on Ethereum** with an L1 transaction that costs L1 gas.
That final claim is mandatory and easy to forget in UX design.

Failed deposits are not lost.
Deposits use Arbitrum retryable tickets and can be manually redeemed from the bridge interface within 7 days.

A bridged ERC-20 has a **different address on L2** than on Ethereum.
Resolve it with `calculateL2TokenAddress` on the L2 Gateway Router.

## 6. Robinhood Stock Tokens

### What they are, legally

Tokenized **debt securities** issued by Robinhood Assets (Jersey) Limited ("RHJ"), registration number 162428.
They give economic exposure to underlying securities but grant **no legal or beneficial rights** in, or against the issuer of, those underlying securities.

Not registered under US securities law.
May not be offered or sold to US persons, with further restrictions in Canada, the UK, and Switzerland.
Full prospectus and restricted-jurisdiction list: <http://docs.robinhood.com/rhj>.

Only **Authorised Participants** (at issuance, only BBVI) can mint or redeem directly with RHJ, after KYB onboarding.
Everyone else, including you, composes with tokens that already exist on the secondary market.
There is no permissionless mint path to design around.

### What they are, technically

Standard ERC-20, **18 decimals**, one contract per ticker, all on chain 4663.
They also implement **ERC-8056 (Scaled UI Amount Extension)**.

**96 tokens were active at capture, all with `ASSET_STATUS_ACTIVE`.**
Full table with addresses, ISINs, UIDs, multipliers, and matched feeds: `robinhood-chain/16-token-contracts.md`.

Base tokens:

| Symbol | Address |
| --- | --- |
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |
| USDG | `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |

### Architecture: they are beacon proxies

Not documented anywhere by Robinhood, found by inspection.

All 96 Stock Tokens have **byte-identical 284-byte bytecode**.
They are beacon proxies sharing one beacon and one implementation:

| Role | Address |
| --- | --- |
| Beacon | `0xe10B6f6B275De231345c20d14aB812DB62151B00` |
| Implementation | `0xb35490d6f9163de4f80d88dc75c3516eb64c5ae2` |

**One beacon upgrade changes the logic of all 96 tokens at once.**
If your protocol accepts Stock Tokens as collateral, that is an upgrade dependency you are inheriting, and it is not per-token.
`owner()` on the beacon reverts, so the upgrade authority is not exposed via Ownable; check Blockscout before assuming who controls it.

### The multiplier (ERC-8056)

Corporate actions are handled by an on-chain **multiplier** rather than by rebasing.
Raw balances and total supply never change.
`balanceOf()` and `totalSupply()` are stable, which means Stock Tokens are safe for AMM pools and lending markets that break on rebasing tokens.

```
underlying shares = raw token amount x uiMultiplier() / 1e18
```

`uiMultiplier()` is 18-decimal fixed point, so `1e18` is 1.0.
At launch every token is `1e18`.
Dividends are **reinvested** into the multiplier, so a Stock Token tracks the **total return** of the underlying, not just its share price.
Over time the token price drifts above the headline share price, and this is expected, not a bug.

Interface, all confirmed live on every token:

```solidity
interface IScaledUIAmount {
    function uiMultiplier() external view returns (uint256);
    event UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAtTimestamp);
    event TransferWithScaledUI(address indexed from, address indexed to, uint256 value, uint256 uiValue);
}

interface IScaledUIAmountNewUIMultiplier {
    function newUIMultiplier() external view returns (uint256); // staged value
    function effectiveAt()     external view returns (uint256); // when it activates
}

interface IScaledUIAmountBalances {
    function balanceOfUI(address account) external view returns (uint256);
    function totalSupplyUI()              external view returns (uint256);
}
```

Also present on-chain: `oraclePaused()` and `uid()`.
Absent on-chain (they revert): `owner()`, `version()`, `isin()`, `oracle()`.
ISIN comes from the REST registry, not from the contract.

**Trap: `effectiveAt()` is not cleared after an update lands.**
Seven tokens had a non-zero `effectiveAt()` with a timestamp in the past and `newUIMultiplier() == uiMultiplier()`.
A non-zero `effectiveAt()` does **not** mean an update is pending.
Detect a genuinely scheduled change by comparing `newUIMultiplier()` against `uiMultiplier()`, or by testing `effectiveAt() > block.timestamp`.

Verified across all 96 tokens: `totalSupplyUI() == totalSupply() * uiMultiplier() / 1e18` holds exactly.

### Update paths and oracle pauses

Robinhood updates the multiplier two ways:

- `updateMultiplier(uint256)` applies immediately. Used for small, continuous dividend reinvestments.
- `updateMultiplier(uint256, uint256 effectiveAt)` stages a value, exposed via `newUIMultiplier()` and `effectiveAt()`. Used for large, discontinuous actions like splits, and requires a scheduled pause window and manual confirmation.

During a corporate action the feed is **paused** so an inconsistent price is never published:

1. Robinhood calls `pauseOracle()`, freezing the feed at the last good value.
2. The new multiplier is staged or applied.
3. After the underlying price and multiplier agree, `unpauseOracle()` is called.
4. The feed resumes with the updated multiplier.

Read this state via `oraclePaused()` on the token.
Treat `true` as "price temporarily unavailable", not as zero or stale.
**The flag is advisory and not enforced on-chain**, so a paused oracle may still return a value.
Keep the `updatedAt` staleness check as your primary guard.

At capture, no token had `oraclePaused() == true`.

## 7. Prices

### On-chain: Chainlink feeds

Standard `AggregatorV3Interface`, read through the **proxy**.
Robinhood equity feeds return the **token** price, already multiplier-adjusted.
Do not apply the multiplier yourself.

```
Token Price = Underlying Equity Market Price x uiMultiplier()
```

```solidity
(, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(PROXY).latestRoundData();
require(answer > 0, "bad price");
require(block.timestamp - updatedAt < HEARTBEAT, "stale price");
```

Most USD feeds use **8 decimals**, but call `decimals()` rather than hardcoding.

Presentation, same economics either way:

| You want | Compute |
| --- | --- |
| Token value (default) | feed price directly |
| Underlying share price | `feedPrice * 1e18 / uiMultiplier()` |
| Share-equivalent units | `balance * uiMultiplier() / 1e18` |

**56 feeds exist on Robinhood Chain and all 56 returned live data when called.**
35 are Robinhood tokenized-equity feeds, 21 are crypto, stablecoin, and exchange-rate feeds.
All are 8 or 18 decimals, 86400 s heartbeat, 0.5% deviation threshold.
Full table: `robinhood-chain/11-chainlink-feed-addresses.md`.
Machine-readable source: <https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json>.

**Three gaps between the docs and reality:**

1. **Only 35 of 96 Stock Tokens have a Chainlink feed.** The docs say every Stock Token has a live price feed. 61 did not. Handle the missing-feed case explicitly rather than assuming coverage.
2. **No L2 Sequencer Uptime Feed is published for Robinhood Chain.** The docs recommend checking one before trusting a price and give sample code, but the Chainlink directory lists none for this network. That best practice is currently not actionable here.
3. **On-chain `description()` is inconsistent.** Some feeds return `Robinhood NVDA / USD`, others `RHNVDA / USD`. Never match feeds by parsing `description()`.

Observed feed update ages ranged from ~15 minutes to ~15 hours, well inside the heartbeat but far from tick-by-tick.
For low-latency data use Data Streams.

### On-chain: Chainlink Data Streams

Pull-based, sub-second latency, signed off-chain reports verified on-chain.
Suited to perps, options, liquidations, and high-frequency strategies.

| Network | VerifierProxy |
| --- | --- |
| Robinhood Chain | `0xcE73c8ad08CBDEaCa6078BF0627C8fe0a9a536E7` (verified deployed, 7,009 B) |

Call `verify()` on that contract to authenticate a report before acting on it.
SDKs in Go, TypeScript, and Rust; REST and WebSocket access; dashboards at <https://data.chain.link/streams>.

### Off-chain: Robinhood REST API

Read-only, base `https://api.robinhood.com/rhj/`, **60 req/s**, cached.
No authentication was required for `/assets` at capture.

| Endpoint | Cache | Returns |
| --- | --- | --- |
| `GET /rhj/assets` | - | Asset metadata, deployments, current and pending multiplier, logo, trading capabilities |
| `GET /rhj/prices/{symbol}` | 15 s | Raw underlying-equity bid/ask, volume, halt flag |
| `GET /rhj/corporate-actions` | 1 hour | Processed corporate actions, most recent first |

**Critical: the two price surfaces are not the same number.**
REST `/prices` returns the **raw underlying-equity** bid/ask, **not** multiplier-adjusted.
The Chainlink feed returns the **multiplier-adjusted token** price.
If you mix them, apply `currentMultiplier` from `/assets` to convert, or you will misprice every token whose multiplier has drifted from 1.0.

Always pass `/{symbol}` on `/prices` to avoid extra latency.

Use `/corporate-actions` to reconcile *why* a multiplier changed: a `FORWARD_SPLIT` entry with `oldRate`/`newRate` explains the corresponding `uiMultiplier()` update.
Types active at launch are forward split, reverse split, cash dividend, and stock dividend; the rest of the enum is forward-compatibility only.

**The documented `/assets` schema is stale.**
The live response differs from the docs:

| Field | Docs | Live |
| --- | --- | --- |
| `tradingCapabilities` | `fractionalTradability`, `allDayTradability`, `extendedHoursFractionalTradability` | `market` / `extended` / `overnight`, each with `whole` and `fractional`, valued `TRADING_STATUS_*` |
| `tokenDecimals` | absent | present (18) |
| `isin` | absent | present |
| `deployments[].networkName` | absent | present |

Code against the live response, not the documented schema.

**Registry integrity.** All 96 tokens were cross-checked field by field against chain state.
Zero mismatches on symbol, name, decimals, `uiMultiplier`, and `uid`.
The REST registry is a faithful mirror, so it is safe for discovery.
Still read prices and multipliers on-chain when they drive money movement.

## 8. Liquidity and trading

Stock Tokens are plain ERC-20s and transfer in any wallet.
Trading routes:

| Venue | Mechanism | Notes |
| --- | --- | --- |
| RFQ | Signed market-maker quotes via 0x RFQ, 1inch Fusion, LiFi | Primary route at launch; off-chain quotes, so not composable inside a contract call |
| AMM | Uniswap pools | Fully composable on-chain |
| propAMM | Rialto | Market-maker-backed but on-chain, so composable, unlike RFQ |
| Orderbook | Lighter (spot and perps) | Separate integration |
| Direct mint/burn | With RHJ | Authorised Participants only, KYB required |

If your design needs to trade Stock Tokens **inside a smart contract**, RFQ will not work: the quotes are off-chain signatures.
Use an AMM or propAMM route for atomic on-chain composition.

## 9. Contract addresses

### L2 (Robinhood Chain), all verified deployed

| Contract | Address |
| --- | --- |
| L2 Gateway Router | `0x1E324B9316138CA9a73F960213621AD1aaf01B89` |
| L2 ERC20 Gateway | `0xfd9b17206278C16DdaacF6AC8f05dBf97EdCb31e` |
| L2 Arb-Custom Gateway | `0x912285144fC0f6e89d3Ed16F5Ab72f87A1878959` |
| L2 Weth Gateway | `0x1D187C3E2dA52D72BC9C41e3AbA0fdFa6a7bF055` |
| L2 Proxy Admin | `0xa3Acd31AFb851B4eB9DAD00F5204c01D924267dF` |
| L2 Multicall (per docs) | `0x2cAC2D899eCC914d704FeaAE33ac1bF36277DaD1` |
| **Multicall3 (canonical, undocumented)** | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| Permit2 | `0x000000000022D473030F116dDEE9F6B43aC78BA3` |
| **CREATE2 deployer (undocumented)** | `0x4e59b44847b379578588920cA78FbF26c0B4956C` |
| Data Streams VerifierProxy | `0xcE73c8ad08CBDEaCa6078BF0627C8fe0a9a536E7` |

Multicall3 at its canonical cross-chain address is not in the docs but is deployed and working.
It makes batched reads dramatically cheaper: the verification pass behind this document read 960 token fields in 4 RPC calls.
The CREATE2 deployer being present means Foundry's deterministic deployment works out of the box.

### Ethereum L1 core

| Contract | Mainnet | Testnet (Sepolia) |
| --- | --- | --- |
| Rollup | `0x23A19d23e89166adedbDcB432518AB01e4272D94` | `0xdc5F8E399DBd8a9F5F87AeC4C23Beb12431b386D` |
| Sequencer Inbox | `0xBd0D173EEb87D57A09521c24388a12789F33ba96` | `0xA0D9dB3DC9791D54b5183C1C1866eFe1eCA7D414` |
| Delayed Inbox | `0x1A07cc4BD17E0118BdB54D70990D2158AbAD7a2D` | `0xF2939afA86F6f933A3CE17fCAB007907B6b0B7a4` |
| Bridge | `0xDf8755334ce7A73cCF6b581C02eA649AE3E864b3` | `0x96295BDad104eaD97cC08797b3dC68efF59CcF30` |
| Outbox | `0xf0ce991ea4A0d2400A4AB49b20ae333f6Dce3DE9` | `0x8D180Caf588f3Da027BEf1F42a106Da93F90b166` |
| L1 Gateway Router | `0x6a2E3a1e16FC29f27Ce61429746D558d656975bB` | `0xF6F11aAEE80875776C264d93B37B34cE437382D1` |
| CoreProxyAdmin / L1 Proxy Admin | `0x1232813BDd40aa9d53066A880dE78a4Be70B90FD` | `0x20d5d542c1bF0a3c295524Eaef336fC07e890622` |

Full L1 gateway set in `robinhood-chain/17-protocol-contracts.md`.

### Arbitrum precompiles (same address on both networks)

| Precompile | Address |
| --- | --- |
| ArbSys | `0x0000000000000000000000000000000000000064` |
| ArbInfo | `0x0000000000000000000000000000000000000065` |
| ArbAddressTable | `0x0000000000000000000000000000000000000066` |
| ArbFunctionTable | `0x0000000000000000000000000000000000000068` |
| ArbOwnerPublic | `0x000000000000000000000000000000000000006b` |
| ArbGasInfo | `0x000000000000000000000000000000000000006C` |
| ArbAggregator | `0x000000000000000000000000000000000000006D` |
| ArbRetryableTx | `0x000000000000000000000000000000000000006E` |
| ArbStatistics | `0x000000000000000000000000000000000000006F` |
| ArbOwner | `0x0000000000000000000000000000000000000070` |
| ArbWasm | `0x0000000000000000000000000000000000000071` |
| ArbWasmCache | `0x0000000000000000000000000000000000000072` |
| NodeInterface | `0x00000000000000000000000000000000000000C8` |

`NodeInterface` has **no bytecode**, which is correct.
It is a virtual contract simulated by the node during `eth_call`.
Never `eth_getCode`-gate on it, and never call it from a contract.

### ERC-4337, all verified deployed

| Contract | Address |
| --- | --- |
| EntryPoint v0.6.0 | `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789` |
| SenderCreator v0.6.0 | `0x7fc98430eAEdbb6070B35B39D798725049088348` |
| EntryPoint v0.7.0 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| SenderCreator v0.7.0 | `0xEFC2c1444eBCC4Db75e7613d20C6a62fF67A167C` |
| EntryPoint v0.8.0 | `0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108` |
| SenderCreator v0.8.0 | `0x449ED7C3e6Fee6a97311d4b55475DF59C44AdD33` |
| Safe Module Setup v0.3.0 | `0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47` |
| Safe 4337 Module v0.3.0 (EntryPoint v0.7.0) | `0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226` |

**EIP-7702 is also supported**, so existing EOAs can delegate to contract code and gain batching, sponsorship, and session keys without migrating to a new address.
AA providers: Alchemy (primary), ZeroDev, Privy, Dynamic.

## 10. Deploying

Standard tooling works unmodified: Foundry, Hardhat, ethers.js, viem, Wagmi.

Foundry:

```bash
export RH_RPC_URL=https://rpc.mainnet.chain.robinhood.com
forge create HelloRobinhood --rpc-url $RH_RPC_URL --private-key $PRIVATE_KEY --broadcast

forge verify-contract <address> src/HelloRobinhood.sol:HelloRobinhood \
  --chain-id 4663 --rpc-url $RH_RPC_URL \
  --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api/
```

Hardhat:

```js
networks: {
  robinhood: { url: process.env.RH_RPC_URL, chainId: 4663, accounts: [process.env.PRIVATE_KEY] },
}
```

Testnet is chain ID 46630 with verifier URL `https://explorer.testnet.chain.robinhood.com/api/`.
Deploy to testnet first.

## 11. Cross-chain messaging

Arbitrum Nitro mechanisms throughout.
Use `@arbitrum/sdk` rather than hand-encoding.

Robinhood Chain is a custom chain, so register it once:

```js
import { registerCustomArbitrumNetwork } from "@arbitrum/sdk";
registerCustomArbitrumNetwork({
  name: "Robinhood Chain",
  chainId: 4663,
  parentChainId: 1,
  confirmPeriodBlocks: 45818,
  ethBridge: {
    bridge:         "0xDf8755334ce7A73cCF6b581C02eA649AE3E864b3",
    inbox:          "0x1A07cc4BD17E0118BdB54D70990D2158AbAD7a2D",
    sequencerInbox: "0xBd0D173EEb87D57A09521c24388a12789F33ba96",
    outbox:         "0xf0ce991ea4A0d2400A4AB49b20ae333f6Dce3DE9",
    rollup:         "0x23A19d23e89166adedbDcB432518AB01e4272D94",
  },
});
```

L1 to L2 uses retryable tickets through the Delayed Inbox, typically minutes, redeemable for 7 days if L2 execution fails.
Remember address aliasing on the receiving side.

L2 to L1 uses `ArbSys(0x64).sendTxToL1(...)`, then a claim through the Outbox after the 7-day challenge period.
Code for both directions is in `robinhood-chain/20-cross-chain-messaging.md`.

## 12. Governance and trust assumptions

Worth reading before you assume this chain is as neutral as a generic L2.

**Security Council of 8 signers.**
Robinhood holds 2 seats; 6 are independent.
Routine actions need 6 of 8 plus a **7-day on-chain timelock**.
Emergency actions bypass the timelock and need 7 of 8.

| Seats | Participant |
| --- | --- |
| 2 | Robinhood |
| 1 | BitGo, Inc. |
| 1 | Chainlink Labs |
| 1 | Fireblocks Trust Company |
| 1 | Offchain Labs |
| 1 | Paxos |
| 1 | Talos |

**Validators are permissioned.**
Dispute resolution uses BoLD (Bounded Liquidity Delay).
There are currently **two** validators, operated by Offchain Labs and Alchemy.

Taken with sequencer-level compliance screening and the shared Stock Token beacon, the honest summary is: permissionless to *use* and *build on*, but with meaningful centralized control over inclusion, upgrades, and validation.
Say so plainly in any risk disclosure you write.

## 13. Running a node

Nitro node in Docker, requires the Robinhood-provided chain info file.

| Requirement | Spec |
| --- | --- |
| CPU | Modern multi-core (8+), strong single-core |
| RAM | 64 GB minimum, 128 GB recommended |

Key flags:

- `--chain.info-files=/home/nitro/config/robinhood-chain-info.json` (required)
- `--init.genesis-json-file=/home/nitro/config/robinhood-genesis.json` (**mainnet only**; testnet has no custom genesis)
- `--parent-chain.connection.url` and `--parent-chain.blob-client.beacon-url` (your own L1 endpoints)
- `--node.feed.input.url=wss://feed.mainnet.chain.robinhood.com` for low-latency updates, and it must be `wss://`, not `https://`
- `--init.url=<SNAPSHOT_URL>` on first start to skip syncing from genesis

Mount the data directory at `/home/nitro/.arbitrum`.
The image runs as the `nitro` user, so mounting elsewhere leaves the node unable to persist chain data.

Full commands and troubleshooting in `robinhood-chain/26-run-a-full-node.md`.

## 14. Upgrades

The chain runs Arbitrum Nitro and periodically upgrades ArbOS on a scheduled on-chain activation.
An un-upgraded node stops cleanly at the upgrade block and resumes once updated, with no data loss or resync.
The notices table at <https://docs.robinhood.com/chain/notices-and-upgrades> was **empty** at capture, so there is no upgrade history to review yet.
Node operators should watch that page.

## 15. Integration checklist

Reading prices:

- [ ] Read through the feed **proxy**, never the aggregator
- [ ] Call `decimals()`, never hardcode
- [ ] Reject zero or negative answers
- [ ] Check `updatedAt` against the heartbeat as your **primary** staleness guard
- [ ] Check `oraclePaused()` on the token, but treat it as advisory only
- [ ] Handle the 61 tokens with **no** Chainlink feed
- [ ] Do not apply the multiplier to a Chainlink price; it is already included
- [ ] Do apply the multiplier if you mix in REST `/prices`, which is raw underlying

Handling the multiplier:

- [ ] Detect scheduled updates via `newUIMultiplier() != uiMultiplier()`, not via non-zero `effectiveAt()`
- [ ] Subscribe to `UIMultiplierUpdated` to track corporate actions
- [ ] Reconcile against `/rhj/corporate-actions` for the reason behind a change
- [ ] Remember tokens are **not** rebasing, so `balanceOf` is stable and AMM/lending integration is safe

Writing contracts:

- [ ] `ArbSys(0x64).arbBlockNumber()` for L2 block height, never `block.number`
- [ ] No `prevrandao`/`blockhash` randomness
- [ ] Account for address aliasing in L1-to-L2 access control
- [ ] Minimize calldata, since the L1 data fee dominates
- [ ] Do not build fee-bumping or priority-auction logic
- [ ] Handle silent non-inclusion from compliance screening

Risk disclosure:

- [ ] Stock Tokens are debt securities with no rights in the underlying
- [ ] Not available to US persons; restricted in Canada, UK, Switzerland
- [ ] All 96 tokens are upgradeable through one shared beacon
- [ ] 7-day withdrawal challenge period to Ethereum
- [ ] Two permissioned validators; sequencer-level transaction screening

## 16. Archive index

Verbatim page archive in `robinhood-chain/`.
Generated tables and verification results are marked.

| File | Contents |
| --- | --- |
| `01-overview.md` | Chain overview, ecosystem partner table |
| `02-connecting.md` | Network config, RPC endpoints, providers |
| `03-add-network-to-wallet.md` | Wallet setup |
| `04-bridging.md` | All bridge routes, canonical bridge mechanics |
| `05-blockscout-explorer.md` | Explorer landing page |
| `06-stock-tokens.md` | Stock Token overview and full legal disclaimer |
| `07-building-with-stock-tokens.md` | Use cases, venues, ERC-8056 integration code |
| `08-stock-token-apis.md` | REST API reference |
| `09-eip-8056.md` | Full ERC-8056 specification |
| `10-chainlink-tokenized-equity-feeds.md` | Chainlink Robinhood feed mechanics |
| `11-chainlink-feed-addresses.md` | **Generated** - all 56 feeds, verified live |
| `12-differences-from-ethereum.md` | Nitro semantics differences |
| `13-gas-and-fees.md` | Two-part fee model |
| `14-transaction-finality.md` | Finality stages |
| `15-arbitrum-compliance-filtering.md` | How sequencer screening works |
| `16-token-contracts.md` | **Generated** - all 96 tokens, addresses, ISINs, UIDs, multipliers, feeds |
| `17-protocol-contracts.md` | L1/L2 protocol contracts and precompiles |
| `18-deploy-smart-contracts.md` | Foundry and Hardhat deployment |
| `19-account-abstraction.md` | ERC-4337, EIP-7702, provider quickstarts |
| `20-cross-chain-messaging.md` | Retryable tickets, ArbSys, SDK code |
| `21-oracles-and-price-feeds.md` | Feed integration and best practices |
| `22-data-streams.md` | Data Streams and VerifierProxy |
| `23-chainlink-data-streams.md` | Chainlink Data Streams reference |
| `24-chainlink-l2-sequencer-feeds.md` | Sequencer uptime feed pattern |
| `25-alchemy-robinhood-quickstart.md` | Alchemy API quickstart |
| `26-run-a-full-node.md` | Node operation |
| `27-governance.md` | Security Council, validators |
| `28-notices-and-upgrades.md` | Upgrade notices (empty at capture) |
| `29-terms-of-service.md` | Full terms |
| `30-report-issue.md` | Contact |
| `31-onchain-verification.md` | **Generated** - full on-chain verification results |
| `_raw/` | Untouched Tavily extractions, API responses, on-chain dumps |

Original link list: `robinhood-chain-links.md`.

## 17. Key contacts and canonical links

| Purpose | Link |
| --- | --- |
| Docs | <https://docs.robinhood.com/chain> |
| Explorer | <https://robinhoodchain.blockscout.com> |
| Status | <http://status.robinhoodchain.offchain.io/> |
| Chainlink feeds | <https://docs.chain.link/data-feeds/price-feeds/addresses?network=robinhood> |
| Feed directory (JSON) | <https://reference-data-directory.vercel.app/feeds-robinhood-mainnet.json> |
| RHJ prospectus and restrictions | <http://docs.robinhood.com/rhj> |
| Technical issues, vulnerabilities, partnerships | chain-developers-group@robinhood.com |
| Analytics | <https://arbdata.com/ecosystems/robinhood> |

---

## Caveats

The verbatim archive under `robinhood-chain/` preserves source wording and punctuation exactly, including em dashes, so it is a faithful record.
This master document is original writing.

Docs pages captured 2026-08-12; on-chain state captured at block 34,251,364 the same day.
Re-run the verification before trusting the moving values in a production decision.
