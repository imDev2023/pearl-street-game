"use client";

import {useState} from "react";
import {useAccount, useConnect, useDisconnect, useReadContracts, useSwitchChain} from "wagmi";
import {ClamTokenAbi, ClamVaultAbi, MockUSDGAbi, clamDeployment} from "@pearlstreet/sdk";
import {ACTIVE_CHAIN} from "@/lib/chain";
import {ceilBps, formatUnits6, parseUnits6} from "@/lib/format";
import {useTx, type TxState} from "@/lib/use-tx";

const d = clamDeployment(ACTIVE_CHAIN.id);
const explorer = ACTIVE_CHAIN.blockExplorers.default.url;
const FAUCET_AMOUNT = 1_000n * 1_000_000n;

export function VaultPanel() {
  const {address, isConnected, chainId} = useAccount();
  const {connectors, connect, isPending: connecting} = useConnect();
  const {disconnect} = useDisconnect();
  const {switchChain} = useSwitchChain();
  const wrongChain = isConnected && chainId !== ACTIVE_CHAIN.id;

  const {data, refetch} = useReadContracts({
    contracts: address
      ? [
          {address: d.usdg, abi: MockUSDGAbi, functionName: "balanceOf", args: [address]},
          {address: d.clam, abi: ClamTokenAbi, functionName: "balanceOf", args: [address]},
          {address: d.usdg, abi: MockUSDGAbi, functionName: "allowance", args: [address, d.vault]},
          {address: d.vault, abi: ClamVaultAbi, functionName: "MINT_FEE_BPS"},
          {address: d.vault, abi: ClamVaultAbi, functionName: "REDEEM_FEE_BPS"},
        ]
      : [],
    query: {enabled: !!address, refetchInterval: 8_000},
  });
  const usdgBal = data?.[0]?.result as bigint | undefined;
  const clamBal = data?.[1]?.result as bigint | undefined;
  const allowance = data?.[2]?.result as bigint | undefined;
  const mintFee = (data?.[3]?.result as bigint | undefined) ?? 200n;
  const redeemFee = (data?.[4]?.result as bigint | undefined) ?? 500n;

  const [wrapIn, setWrapIn] = useState("");
  const [redeemIn, setRedeemIn] = useState("");
  const wrapAmt = parseUnits6(wrapIn);
  const redeemAmt = parseUnits6(redeemIn);

  const faucet = useTx();
  const approve = useTx();
  const deposit = useTx();
  const redeem = useTx();
  const busy = [faucet, approve, deposit, redeem].some((t) => t.state.phase === "signing" || t.state.phase === "pending");
  const after = () => void refetch();

  if (!isConnected) {
    return (
      <section className="card">
        <h2>Connect a wallet</h2>
        <p className="muted">Any injected wallet (MetaMask, Rabby, Coinbase Wallet extension). Gasless onboarding arrives with T-007.</p>
        <div className="row">
          {connectors.map((c) => (
            <button key={c.uid} onClick={() => connect({connector: c})} disabled={connecting}>
              {c.name}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <div className="row" style={{justifyContent: "space-between"}}>
          <div>
            <div className="muted" style={{fontSize: 12}}>Connected</div>
            <div className="mono">{address}</div>
          </div>
          <div className="row">
            {wrongChain ? (
              <button className="danger" onClick={() => switchChain({chainId: ACTIVE_CHAIN.id})}>
                Switch to {ACTIVE_CHAIN.name}
              </button>
            ) : null}
            <button className="secondary" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        </div>
        <div className="grid two" style={{marginTop: 14}}>
          <div className="stat">
            <div className="k">Your USDG</div>
            <div className="v" data-testid="usdg-balance">{usdgBal !== undefined ? formatUnits6(usdgBal) : "..."}</div>
            {d.usdgIsMock ? <div className="d">testnet MockUSDG</div> : null}
          </div>
          <div className="stat">
            <div className="k">Your CLAM</div>
            <div className="v" data-testid="clam-balance">{clamBal !== undefined ? formatUnits6(clamBal) : "..."}</div>
          </div>
        </div>
        {d.usdgIsMock ? (
          <div className="row" style={{marginTop: 12}}>
            <button
              className="secondary"
              disabled={busy || wrongChain}
              onClick={() =>
                faucet.send({address: d.usdg, abi: MockUSDGAbi, functionName: "faucet", args: [FAUCET_AMOUNT]}).then(after)
              }
            >
              Faucet: get 1,000 test USDG
            </button>
            <TxStatus state={faucet.state} onRetry={faucet.reset} />
          </div>
        ) : null}
      </section>

      <section className="card">
        <h2>Wrap USDG into CLAM</h2>
        <div className="row">
          <input
            type="text"
            inputMode="decimal"
            placeholder="USDG amount"
            value={wrapIn}
            onChange={(e) => setWrapIn(e.target.value)}
            aria-label="USDG amount to wrap"
          />
          {allowance !== undefined && wrapAmt !== null && allowance < wrapAmt ? (
            <button
              disabled={busy || wrongChain}
              onClick={() =>
                approve.send({address: d.usdg, abi: MockUSDGAbi, functionName: "approve", args: [d.vault, wrapAmt]}).then(after)
              }
            >
              1. Approve
            </button>
          ) : null}
          <button
            disabled={busy || wrongChain || wrapAmt === null || wrapAmt === 0n || (allowance ?? 0n) < (wrapAmt ?? 0n) || (usdgBal ?? 0n) < (wrapAmt ?? 0n)}
            onClick={() => deposit.send({address: d.vault, abi: ClamVaultAbi, functionName: "deposit", args: [wrapAmt!]}).then(after)}
          >
            {allowance !== undefined && wrapAmt !== null && allowance < wrapAmt ? "2. Wrap" : "Wrap"}
          </button>
        </div>
        {wrapAmt !== null && wrapAmt > 0n ? (
          <div className="preview">
            You receive <b className="mono">{formatUnits6(wrapAmt - ceilBps(wrapAmt, mintFee), 6)} CLAM</b>; fee{" "}
            <span className="mono">{formatUnits6(ceilBps(wrapAmt, mintFee), 6)}</span> CLAM to the prize pool.
          </div>
        ) : null}
        <TxStatus state={approve.state} onRetry={approve.reset} label="Approve" />
        <TxStatus state={deposit.state} onRetry={deposit.reset} label="Wrap" />
      </section>

      <section className="card">
        <h2>Redeem CLAM for USDG</h2>
        <div className="row">
          <input
            type="text"
            inputMode="decimal"
            placeholder="CLAM amount"
            value={redeemIn}
            onChange={(e) => setRedeemIn(e.target.value)}
            aria-label="CLAM amount to redeem"
          />
          <button className="secondary" disabled={clamBal === undefined} onClick={() => setRedeemIn(formatUnits6(clamBal ?? 0n, 6).replace(/,/g, ""))}>
            Max
          </button>
          <button
            disabled={busy || wrongChain || redeemAmt === null || redeemAmt === 0n || (clamBal ?? 0n) < (redeemAmt ?? 0n)}
            onClick={() => redeem.send({address: d.vault, abi: ClamVaultAbi, functionName: "redeem", args: [redeemAmt!]}).then(after)}
          >
            Redeem
          </button>
        </div>
        {redeemAmt !== null && redeemAmt > 0n ? (
          <div className="preview">
            You receive <b className="mono">{formatUnits6(redeemAmt - ceilBps(redeemAmt, redeemFee), 6)} USDG</b>; fee{" "}
            <span className="mono">{formatUnits6(ceilBps(redeemAmt, redeemFee), 6)}</span> CLAM to the prize pool. No approval needed.
          </div>
        ) : null}
        <TxStatus state={redeem.state} onRetry={redeem.reset} label="Redeem" />
      </section>
    </>
  );
}

function TxStatus({state, onRetry, label}: {state: TxState; onRetry: () => void; label?: string}) {
  if (state.phase === "idle") return null;
  const link = "hash" in state ? (
    <a href={`${explorer}/tx/${state.hash}`} target="_blank" rel="noreferrer" className="mono">
      {state.hash.slice(0, 10)}...
    </a>
  ) : null;
  const prefix = label ? `${label}: ` : "";
  switch (state.phase) {
    case "signing":
      return <div className="status">{prefix}confirm in your wallet...</div>;
    case "pending":
      return <div className="status">{prefix}sent {link}, waiting for the sequencer...</div>;
    case "confirmed":
      return <div className="status ok">{prefix}confirmed {link}</div>;
    case "timeout":
      return (
        <div className="status err">
          {prefix}no receipt after 45s for {link}. Robinhood Chain can drop transactions silently; check the
          explorer, then <button className="secondary" onClick={onRetry}>try again</button>.
        </div>
      );
    case "error":
      return (
        <div className="status err">
          {prefix}{state.message} <button className="secondary" onClick={onRetry}>dismiss</button>
        </div>
      );
  }
}
