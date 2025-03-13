import { useChainContext } from '../components/providers/ThirdwebProviderWrapper';
import { getContractAddresses } from '../config/contracts';

/**
 * Custom hook that returns the contract addresses for the currently selected chain
 */
export function useContractAddresses() {
  const { activeChain } = useChainContext();
  
  // Get the contract addresses for the current chain
  const addresses = getContractAddresses(activeChain.chainId);
  
  return addresses;
} 