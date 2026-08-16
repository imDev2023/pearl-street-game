"use client";

import {useReadContracts} from "wagmi";
import {ClamTokenAbi, ClamVaultAbi, MockUSDGAbi, clamDeployment} from "@pearlstreet/sdk";
import {ACTIVE_CHAIN} from "@/lib/chain";
import {formatUnits6} from "@/lib/format";

const d = clamDeployment(ACTIVE_CHAIN.id);
const explorer = ACTIVE_CHAIN.blockExplorers.default.url;

export function ProofOfReserve() {
  const {data, dataUpdatedAt, isError, error} = useReadContracts({
    contracts: [
      {address: d.vault, abi: ClamVaultAbi, functionName: "reserve"},
      {address: d.clam, abi: ClamTokenAbi, functionName: "totalSupply"},
      {address: d.vault, abi: ClamVaultAbi, functionName: "reserveSurplus"},
      {address: d.vault, abi: ClamVaultAbi, functionName: "MINT_FEE_BPS"},
      {address: d.vault, abi: ClamVaultAbi, functionName: "REDEEM_FEE_BPS"},
      {address: d.clam, abi: ClamTokenAbi, functionName: "balanceOf", args: [d.feeRouter]},
      {address: d.usdg, abi: MockUSDGAbi, functionName: "totalSupply"},
    ],
    query: {refetchInterval: 10_000},
  });

  const reserve = data?.[0]?.result as bigint | undefined;
  const supply = data?.[1]?.result as bigint | undefined;
  const surplus = data?.[2]?.result as bigint | undefined;
  const mintFee = data?.[3]?.result as bigint | undefined;
  const redeemFee = data?.[4]?.result as bigint | undefined;
  const pendingFees = data?.[5]?.result as bigint | undefined;
  const usdgSupply = data?.[6]?.result as bigint | undefined;
  const loaded = reserve !== undefined && supply !== undefined && surplus !== undefined;
  const backed = loaded && reserve >= supply;

  return (
    <>
      <section className="card" aria-labelledby="reserve-h">
        <h2 id="reserve-h">The invariant, live</h2>
        <div className="grid">
          <div className="stat">
            <div className="k">USDG reserve</div>
            <div className="v" data-testid="reserve">{loaded ? formatUnits6(reserve) : "..."}</div>
            <div className="d">reserve()</div>
          </div>
          <div className="stat">
            <div className="k">CLAM supply</div>
            <div className="v" data-testid="supply">{loaded ? formatUnits6(supply) : "..."}</div>
            <div className="d">totalSupply()</div>
          </div>
          <div className="stat">
            <div className="k">Difference</div>
            <div className={"v " + (loaded ? (backed ? "ok" : "bad") : "")} data-testid="surplus">
              {loaded ? formatUnits6(surplus, 6) : "..."}
            </div>
            <div className="d">{loaded ? (backed ? "reserve minus supply: fully backed" : "UNDER-BACKED, do not use") : "reading chain"}</div>
          </div>
          <div className="stat">
            <div className="k">Fees pending</div>
            <div className="v">{pendingFees !== undefined ? formatUnits6(pendingFees) : "..."}</div>
            <div className="d">CLAM at the FeeRouter, anyone can flush() it to the pool</div>
          </div>
        </div>
        <p className="muted" style={{fontSize: 13, marginBottom: 0}}>
          {isError ? (
            <span className="bad">RPC read failed: {String(error?.message ?? error)}. Retrying.</span>
          ) : dataUpdatedAt ? (
            <>Last read {new Date(dataUpdatedAt).toLocaleTimeString()} from {ACTIVE_CHAIN.rpcUrls.default.http[0]}.</>
          ) : (
            "Reading..."
          )}
          {usdgSupply !== undefined && d.usdgIsMock ? (
            <> Testnet: MockUSDG supply {formatUnits6(usdgSupply)} (faucet-minted, no value).</>
          ) : null}
        </p>
      </section>

      <section className="card" aria-labelledby="fees-h">
        <h2 id="fees-h">Fee schedule</h2>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Fee</th>
              <th>Where it goes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Wrap USDG into CLAM</td>
              <td className="mono">{mintFee !== undefined ? `${Number(mintFee) / 100}%` : "..."}</td>
              <td>100% to the prize pool</td>
            </tr>
            <tr>
              <td>Redeem CLAM for USDG</td>
              <td className="mono">{redeemFee !== undefined ? `${Number(redeemFee) / 100}%` : "..."}</td>
              <td>100% to the prize pool</td>
            </tr>
          </tbody>
        </table>
        <p className="muted" style={{fontSize: 13, marginBottom: 0}}>
          Fees are compile-time constants read from the contract; there is no setter and no admin. Rounding is
          always in the protocol&apos;s favor.
        </p>
      </section>

      <section className="card" aria-labelledby="contracts-h">
        <h2 id="contracts-h">Contracts ({ACTIVE_CHAIN.name})</h2>
        <table>
          <tbody>
            {(
              [
                ["ClamVault", d.vault],
                ["CLAM token", d.clam],
                ["FeeRouter", d.feeRouter],
                [d.usdgIsMock ? "MockUSDG (testnet)" : "USDG", d.usdg],
              ] as const
            ).map(([name, addr]) => (
              <tr key={name}>
                <td>{name}</td>
                <td className="mono">
                  <a href={`${explorer}/address/${addr}`} target="_blank" rel="noreferrer">
                    {addr}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
