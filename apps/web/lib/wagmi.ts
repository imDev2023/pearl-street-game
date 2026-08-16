"use client";

import {createConfig, http, injected} from "wagmi";
import {ACTIVE_CHAIN} from "./chain";

export const wagmiConfig = createConfig({
  chains: [ACTIVE_CHAIN],
  connectors: [injected()],
  transports: {[ACTIVE_CHAIN.id]: http()},
  ssr: true,
});
