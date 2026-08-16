"use client";

import {useCallback, useState} from "react";
import {usePublicClient, useWriteContract} from "wagmi";
import type {Abi} from "viem";

/**
 * Send a contract write and wait for its receipt with a timeout.
 * Robinhood Chain's sequencer can silently drop transactions, so the UI must never assume
 * inclusion: after `timeoutMs` without a receipt the state becomes `timeout` and the user is
 * offered a retry instead of an endless spinner.
 */
export type TxState =
  | {phase: "idle"}
  | {phase: "signing"}
  | {phase: "pending"; hash: `0x${string}`}
  | {phase: "confirmed"; hash: `0x${string}`}
  | {phase: "timeout"; hash: `0x${string}`}
  | {phase: "error"; message: string};

export function useTx(timeoutMs = 45_000) {
  const client = usePublicClient();
  const {writeContractAsync} = useWriteContract();
  const [state, setState] = useState<TxState>({phase: "idle"});

  const send = useCallback(
    async (args: {address: `0x${string}`; abi: Abi; functionName: string; args?: readonly unknown[]}) => {
      if (!client) return;
      setState({phase: "signing"});
      let hash: `0x${string}`;
      try {
        hash = await writeContractAsync(args as Parameters<typeof writeContractAsync>[0]);
      } catch (e) {
        setState({phase: "error", message: shortError(e)});
        return;
      }
      setState({phase: "pending", hash});
      try {
        const receipt = await client.waitForTransactionReceipt({hash, timeout: timeoutMs, pollingInterval: 1_500});
        if (receipt.status === "success") setState({phase: "confirmed", hash});
        else setState({phase: "error", message: `Transaction ${hash.slice(0, 10)} reverted`});
      } catch {
        setState({phase: "timeout", hash});
      }
    },
    [client, writeContractAsync, timeoutMs],
  );

  const reset = useCallback(() => setState({phase: "idle"}), []);
  return {state, send, reset};
}

function shortError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const firstLine = msg.split("\n")[0] ?? msg;
  return firstLine.length > 160 ? firstLine.slice(0, 157) + "..." : firstLine;
}
