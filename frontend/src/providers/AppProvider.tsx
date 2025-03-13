"use client";

import { ThirdwebProvider } from "@thirdweb-dev/react";
import { ThemeProvider } from "next-themes";
import { ContractInterface } from "ethers";

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
  name: "Base Sepolia Testnet",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <ThirdwebProvider
        activeChain={baseSepolia}
        clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
      >
        {children}
      </ThirdwebProvider>
    </ThemeProvider>
  );
} 