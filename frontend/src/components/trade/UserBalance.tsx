"use client";

import { useAddress, useContract, useContractRead, useContractWrite } from "@thirdweb-dev/react";
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
  
  const { contract } = useContract(USD_TOKEN_ADDRESS, USD_ABI as ContractInterface);

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

  // Add console logs for debugging
  useEffect(() => {
    console.log("Chain ID:", activeChain.chainId);
    console.log("USD Token Address:", USD_TOKEN_ADDRESS);
    console.log("Contract:", contract);
  }, [activeChain.chainId, USD_TOKEN_ADDRESS, contract]);

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
