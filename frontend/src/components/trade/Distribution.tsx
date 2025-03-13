"use client";

import React, { useMemo } from "react";
import { formatUnits } from "viem";
import { CircularProgress, Paper, Typography, Box } from "@mui/material";
import { useContract, useContractRead } from "@thirdweb-dev/react";
import { PARIMUTUEL_ABI, PARIMUTUEL_ADDRESS } from "../../config/contracts";
import { ContractInterface } from "ethers";

const Distribution = () => {
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

  const { shortPercentage, longPercentage } = useMemo(() => {
    const shortTokensValue = shortTokens
      ? parseFloat(formatUnits(shortTokens.toString(), 18))
      : 0;
    const longTokensValue = longTokens
      ? parseFloat(formatUnits(longTokens.toString(), 18))
      : 0;
    const totalValue = shortTokensValue + longTokensValue;

    const shortPercentage =
      totalValue === 0 ? 50 : (shortTokensValue / totalValue) * 100;
    const longPercentage =
      totalValue === 0 ? 50 : (longTokensValue / totalValue) * 100;

    return { shortPercentage, longPercentage };
  }, [shortTokens, longTokens]);

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
        Distribution
      </Typography>
      {loading ? (
        <CircularProgress size={24} />
      ) : (
        <Box mt={2} width="100%">
          <Box sx={{ display: 'flex', height: 20, bgcolor: 'grey.800', borderRadius: 1 }}>
            <Box
              sx={{
                width: `${shortPercentage}%`,
                bgcolor: 'error.main',
                transition: 'width 0.5s ease-in-out'
              }}
            />
            <Box
              sx={{
                width: `${longPercentage}%`,
                bgcolor: 'success.main',
                transition: 'width 0.5s ease-in-out'
              }}
            />
          </Box>
          <Box 
            mt={1} 
            display="flex" 
            justifyContent="space-between"
          >
            <Typography 
              variant="body2" 
              sx={{ color: 'error.main' }}
            >
              {shortPercentage.toFixed(2)}% Short
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ color: 'success.main' }}
            >
              {longPercentage.toFixed(2)}% Long
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default React.memo(Distribution);
