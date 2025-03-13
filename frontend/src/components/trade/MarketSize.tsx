"use client";

import { formatUnits } from "viem";
import { Paper, Typography, Box, CircularProgress } from "@mui/material";
import { useContract, useContractRead } from "@thirdweb-dev/react";
import { PARIMUTUEL_ABI, PARIMUTUEL_ADDRESS } from "../../config/contracts";
import { ContractInterface } from "ethers";

function MarketSize() {
  const { contract } = useContract(PARIMUTUEL_ADDRESS, PARIMUTUEL_ABI as ContractInterface);

  const { data: shortTokens, isLoading: isShortTokensLoading } = useContractRead(
    contract,
    "shortTokens"
  );

  const { data: longTokens, isLoading: isLongTokensLoading } = useContractRead(
    contract,
    "longTokens"
  );

  const loading = isShortTokensLoading || isLongTokensLoading;

  if (loading) {
    return (
      <Paper 
        sx={{ 
          bgcolor: '#1a1b1e',
          p: 2,
          height: '120px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Market Size
        </Typography>
        <CircularProgress size={24} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  const shortTokensValue = shortTokens ? BigInt(shortTokens.toString()) : BigInt(0);
  const longTokensValue = longTokens ? BigInt(longTokens.toString()) : BigInt(0);
  const marketSizeValue = shortTokensValue + longTokensValue;

  const formattedMarketSize = formatUnits(marketSizeValue, 8);

  const formattedMarketSizeDisplay = parseFloat(formattedMarketSize).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  );

  return (
    <Paper 
      sx={{ 
        bgcolor: '#1a1b1e',
        p: 2,
        height: '120px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Typography variant="h6" sx={{ color: 'text.secondary' }}>
        Open Interest
      </Typography>
      <Box mt={1}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
          ${formattedMarketSizeDisplay}
        </Typography>
        <Typography variant="body2" sx={{ color: 'grey.500' }}>
          Total value traded
        </Typography>
      </Box>
    </Paper>
  );
}

export default MarketSize;
