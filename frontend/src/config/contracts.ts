import { type Address } from 'viem';
import ParimutuelABI from './ParimutuelABI.json';
import USDABI from './USDABI.json';
import { useChainContext } from '../components/providers/ThirdwebProviderWrapper';

// Contract ABIs
export const PARIMUTUEL_ABI = ParimutuelABI;
export const USD_ABI = USDABI;

export interface Position {
    owner: string;
    margin: bigint;
    leverage: bigint;
    tokens: bigint;
    entry: bigint;
    liquidation: bigint;
    profit: bigint;
    shares: bigint;
    funding: bigint;
    active: boolean;
}

// Contract addresses for different networks
interface ContractAddresses {
  usdToken: Address;
  parimutuel: Address;
  // Add other contract addresses as needed
}

interface ContractConfig {
  [chainId: number]: ContractAddresses;
}

// Contract addresses for each supported network
const contracts: ContractConfig = {
  // Base Sepolia
  84532: {
    usdToken: process.env.NEXT_PUBLIC_BASE_SEPOLIA_USD_ADDRESS as Address,
    parimutuel: process.env.NEXT_PUBLIC_BASE_SEPOLIA_PARIMUTUEL_ADDRESS as Address,
    // Add other Base Sepolia contract addresses here
  },
  
  // Monad Testnet
  10143: {
    usdToken: process.env.NEXT_PUBLIC_MONAD_TESTNET_USD_ADDRESS as Address,
    parimutuel: process.env.NEXT_PUBLIC_MONAD_TESTNET_PARIMUTUEL_ADDRESS as Address,
    // Add other Monad Testnet contract addresses here
  }
};

// Helper function to get contract addresses for the current chain
export function getContractAddresses(chainId: number): ContractAddresses {
  const addresses = contracts[chainId];
  
  if (!addresses) {
    throw new Error(`No contract addresses configured for chain ID: ${chainId}`);
  }
  
  return addresses;
}

// For backward compatibility - these will be deprecated
// Use useContractAddresses hook instead
export const USD_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_USD_ADDRESS as Address;
export const PARIMUTUEL_ADDRESS = process.env.NEXT_PUBLIC_PARIMUTUEL_ADDRESS as Address;

export default contracts;
