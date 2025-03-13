"use client";

import { ThirdwebProvider } from "@thirdweb-dev/react";
import { createContext, useContext, useState } from "react";

interface Chain { 
  chainId: number;
  rpc: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  shortName: string;
  slug: string;
  testnet: boolean;
  chain: string;
  name: string;
}

const baseSepolia: Chain = {
  chainId: 84532,
  rpc: ["https://sepolia.base.org"],
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  shortName: "base-sepolia",
  slug: "base-sepolia",
  testnet: true,
  chain: "Base Sepolia",
  name: "Base Sepolia",
};

const monadTestnet: Chain = {
  chainId: 10143,
  rpc: ["https://testnet-rpc.monad.xyz"],
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  shortName: "monad-testnet",
  slug: "monad-testnet",
  testnet: true,
  chain: "Monad Testnet",
  name: "Monad Testnet",
};

// Define available chains
export const supportedChains = [baseSepolia, monadTestnet];

// Create a context for chain selection
interface ChainContextType {
  activeChain: Chain;
  setActiveChain: (chain: Chain) => void;
  supportedChains: Chain[];
}

export const ChainContext = createContext<ChainContextType | undefined>(undefined);

export function useChainContext() {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error("useChainContext must be used within a ThirdwebProviderWrapper");
  }
  return context;
}

export function ThirdwebProviderWrapper({ children }: { children: React.ReactNode }) {
  const [activeChain, setActiveChain] = useState<Chain>(baseSepolia);

  return (
    <ChainContext.Provider value={{ activeChain, setActiveChain, supportedChains }}>
      <ThirdwebProvider
        activeChain={activeChain}
        clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
        autoConnect={true}
        supportedChains={supportedChains}
      >
        {children}
      </ThirdwebProvider>
    </ChainContext.Provider>
  );
} 