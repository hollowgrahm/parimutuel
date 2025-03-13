"use client";

import { formatUnits } from "viem";
import { Paper, Typography, Box, CircularProgress } from "@mui/material";
import { useContract, useContractRead } from "@thirdweb-dev/react";
import { PARIMUTUEL_ABI } from "../../config/contracts";
import { ContractInterface } from "ethers";
import { useContractAddresses } from "../../hooks/useContractAddresses";

function CurrentPrice() {
  const { parimutuel: PARIMUTUEL_ADDRESS } = useContractAddresses();
  const { contract } = useContract(PARIMUTUEL_ADDRESS, PARIMUTUEL_ABI as ContractInterface);

  const { data: price, isLoading } = useContractRead(
    contract,
    "currentPrice"
  );

  const formattedPrice = price 
    ? parseFloat(formatUnits(price.toString(), 8)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0";

  if (isLoading) {
    return (
      <Paper 
        sx={{ 
          bgcolor: '#1a1b1e',
          p: 1.5,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '120px' // Match the loading state of MarketStats
        }}
      >
        <CircularProgress size={24} />
      </Paper>
    );
  }

  return (
    <Paper 
      sx={{ 
        bgcolor: '#1a1b1e',
        p: 1.5, // Match the padding of MarketStats
        width: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" color="text.primary">
        Current Price
      </Typography>
      <Box mt={1}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
          ${formattedPrice}
        </Typography>
        <Typography variant="body2" sx={{ color: 'grey.500' }}>
          BTC/USD
        </Typography>
      </Box>
    </Paper>
  );
}

export default CurrentPrice;
