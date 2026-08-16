# ETH-to-CLAM swap at checkout
Type: research
Status: resolved
Blocked by: -

## Question
The Gen-0 checkout promises "ETH accepted only via a swap". Is there a live DEX or router on chain 4663 with an ETH/USDG pool (Uniswap V3 deployment, Robinhood-native venue, aggregator)? If not, what is the minimum viable path (drop ETH checkout, or bridge/onramp link)?

## Answer
Verified on mainnet RPC 2026-08-16: Uniswap v2/v3/v4 + UniversalRouter are live on chain 4663 (official list: developers.uniswap.org/deployments.json).
v3 SwapRouter02 `0xCaf681a66D020601342297493863E78C959E5cb2`, QuoterV2 `0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7`, WETH `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`, factory `0x1f7d7550B1b028f7571E69A784071F0205FD2EfA`.
WETH/USDG 0.01% pool `0x52e65b17fb6e5ba00ed806f37afcd2daa50271ca` holds ~2,985 WETH + 3.08M USDG (~$8.7M); 1 ETH quotes ~1,877 USDG with 0.02% impact at 10 ETH.
Ignore the Ethereum-canonical-address clones on Blockscout (`0x1F98...`, `0xE592...`): not in Uniswap's official list.
Users reach the chain with ETH/USDG directly from the Robinhood app (not NY), or via Across/Relay/LI.FI intents from Arbitrum One, or the canonical L1 bridge.
Decision: keep ETH-via-swap at checkout (exactOutputSingle WETH->USDG fee 100 through SwapRouter02, refund dust) AND accept USDG directly; link LI.FI/Relay for other chains. Owned by T-003 (checkout) and T-007 (onboarding).
