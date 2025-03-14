"use client";

import { useAddress, useContract, useContractRead, useContractWrite, useSDK } from "@thirdweb-dev/react";
import { formatUnits } from "viem";
import { Paper, Typography, Box, CircularProgress, Button } from "@mui/material";
import { USD_ABI } from "../../config/contracts";
import { ContractInterface } from "ethers";
import { toast } from "sonner";
import { useEffect } from "react";
import { useContractAddresses } from "../../hooks/useContractAddresses";
import { useChainContext } from "../providers/ThirdwebProviderWrapper";

function UserBalance() {
  const userAddress = useAddress();
  const { activeChain } = useChainContext();
  const { usdToken: USD_TOKEN_ADDRESS } = useContractAddresses();
  const sdk = useSDK();
  
  // Use the hardcoded address directly from the .env file
  // This is a temporary fix to bypass the hook
  const hardcodedAddress = "0x1d347B071E7A8DF2E5AeefcAE5ce02Ef356F28c9"; // Base Sepolia USD address
  
  // Log the addresses for debugging
  console.log("Chain ID:", activeChain.chainId);
  console.log("USD Token Address from hook:", USD_TOKEN_ADDRESS);
  console.log("Hardcoded Address:", hardcodedAddress);
  console.log("SDK initialized:", !!sdk);
  
  // Try the hardcoded address as a last resort
  const addressToUse = USD_TOKEN_ADDRESS || hardcodedAddress;
  
  const { contract } = useContract(addressToUse, USD_ABI as ContractInterface);
  
  console.log("Contract initialized with address:", addressToUse);
  console.log("Contract object:", contract);

  // Try to initialize the contract directly with the SDK as an alternative approach
  useEffect(() => {
    const initContract = async () => {
      if (sdk && addressToUse) {
        try {
          const contract = await sdk.getContract(addressToUse, USD_ABI as ContractInterface);
          console.log("Contract initialized with SDK:", contract);
          
          // Try to read the balance directly
          if (userAddress) {
            try {
              const balance = await contract.call("balanceOf", [userAddress]);
              console.log("Balance from direct call:", balance);
            } catch (error) {
              console.error("Error reading balance directly:", error);
            }
          }
        } catch (error) {
          console.error("Error initializing contract with SDK:", error);
        }
      }
    };
    
    initContract();
  }, [sdk, addressToUse, userAddress]);

  const {
    data: balance,
    isLoading: isBalanceLoading,
    error: balanceError,
    refetch: refetchBalance
  } = useContractRead(
    contract,
    "balanceOf",
    [userAddress]
  );

  // Log any errors from the contract read
  useEffect(() => {
    if (balanceError) {
      console.error("Balance error details:", balanceError);
    }
  }, [balanceError]);

  // Add polling with useEffect
  useEffect(() => {
    if (userAddress && contract) {
      const interval = setInterval(() => {
        refetchBalance();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [refetchBalance, userAddress, contract]);

  const { mutateAsync: getFaucetFunds, isLoading: isFaucetLoading } = useContractWrite(
    contract,
    "faucet"
  );

  const handleGetFunds = async () => {
    try {
      const tx = await getFaucetFunds({ args: [] });
      await tx.receipt;
      await refetchBalance();
      toast.success("Successfully received funds from faucet!");
    } catch (error) {
      console.error("Error getting funds:", error);
      toast.error("Failed to get funds from faucet");
    }
  };

  if (!userAddress) {
    return (
      <Paper 
        sx={{ 
          bgcolor: '#1a1b1e',
          p: 2,
          width: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Balance
        </Typography>
        <Typography sx={{ mt: 1, color: 'error.main' }}>
          Connect wallet: <Box component="span" fontWeight="bold">{activeChain.name}</Box>.
        </Typography>
      </Paper>
    );
  }

  // Add check for contract availability
  if (!contract) {
    return (
      <Paper 
        sx={{ 
          bgcolor: '#1a1b1e',
          p: 2,
          width: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Balance
        </Typography>
        <Typography sx={{ mt: 1, color: 'error.main' }}>
          Contract not available on {activeChain.name}. Please check your configuration.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper 
      sx={{ 
        bgcolor: '#1a1b1e',
        p: 2,
        width: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" sx={{ color: 'text.secondary' }}>
        USD Balance
      </Typography>
      {isBalanceLoading ? (
        <CircularProgress size={24} sx={{ mt: 1 }} />
      ) : balanceError ? (
        <Typography color="error">
          Error loading data: {balanceError?.toString()}
        </Typography>
      ) : (
        <Box mt={1}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 'bold',
              color: 'success.main',
              mb: balance && parseFloat(formatUnits(balance, 8)) < 1000 ? 2 : 0
            }}
          >
            ${parseFloat(formatUnits(balance, 8)).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </Typography>
          {balance && parseFloat(formatUnits(balance, 8)) < 1000 && (
            <Button
              variant="contained"
              onClick={handleGetFunds}
              disabled={isFaucetLoading}
              fullWidth
              sx={{
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              {isFaucetLoading ? 'Getting Funds...' : 'Get Test Funds'}
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
}

export default UserBalance;
