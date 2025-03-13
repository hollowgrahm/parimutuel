"use client";

import { formatUnits } from "viem";
import { Paper, Typography, Box, CircularProgress } from "@mui/material";
import { useContract, useContractRead } from "@thirdweb-dev/react";
import { PARIMUTUEL_ABI, PARIMUTUEL_ADDRESS } from "../../config/contracts";
import { ContractInterface } from "ethers";

function FundingRate() {
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
          Funding Rate
        </Typography>
        <CircularProgress size={24} sx={{ mt: 1 }} />
      </Paper>
    );
  }

  const shortTokensValue = shortTokens ? parseFloat(formatUnits(shortTokens.toString(), 8)) : 0;
  const longTokensValue = longTokens ? parseFloat(formatUnits(longTokens.toString(), 8)) : 0;
  const marketSizeValue = shortTokensValue + longTokensValue;

  const shortPercentage = (shortTokensValue / marketSizeValue) * 100;
  const longPercentage = (longTokensValue / marketSizeValue) * 100;

  let fundingRateText = "0%";
  let messageText = "";
  if (marketSizeValue !== 0 && shortPercentage !== longPercentage) {
    const fundingRateDifference = Math.abs(shortPercentage - longPercentage).toFixed(2);
    if (shortPercentage > longPercentage) {
      fundingRateText = `${fundingRateDifference}%`;
      messageText = "Long Daily Yield";
    } else {
      fundingRateText = `${fundingRateDifference}%`;
      messageText = "Short Daily Yield";
    }
  }

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
        Funding Rate
      </Typography>
      <Box mt={1}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'white' }}>
          {fundingRateText}
        </Typography>
        {messageText && (
          <Typography variant="body2" sx={{ color: 'grey.500' }}>
            {messageText}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

export default FundingRate;
