"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Chain = "evm" | "solana";

type ChainContextType = {
  chain: Chain;
  setChain: (c: Chain) => void;
};

const ChainContext = createContext<ChainContextType>({
  chain: "evm",
  setChain: () => {},
});

export function ChainProvider({ children }: { children: ReactNode }) {
  const [chain, setChain] = useState<Chain>("evm");

  return (
    <ChainContext.Provider value={{ chain, setChain }}>
      {children}
    </ChainContext.Provider>
  );
}

export function useChain() {
  return useContext(ChainContext);
}
