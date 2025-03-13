"use client";

import { formatUnits } from "viem";
import { Paper, Typography, Box, CircularProgress } from "@mui/material";
import { useContract, useContractRead } from "@thirdweb-dev/react";
import { PARIMUTUEL_ABI, PARIMUTUEL_ADDRESS } from "../../config/contracts";
import { ContractInterface } from "ethers";

function LongProfits() {
  const { contract } = useContract(PARIMUTUEL_ADDRESS, PARIMUTUEL_ABI as ContractInterface);

  const { data: longProfits, isLoading: isLongProfitsLoading } = useContractRead(
    contract,
    "longTokens"
  );

  const formattedProfits = longProfits 
    ? parseFloat(formatUnits(longProfits.toString(), 8)).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    : "0";

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
        Longs
      </Typography>
      {isLongProfitsLoading ? (
        <CircularProgress size={24} sx={{ mt: 1 }} />
      ) : (
        <Box mt={1}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 'bold',
              color: 'text.primary'
            }}
          >
            ${formattedProfits}
          </Typography>
          <Typography variant="body2" sx={{ color: 'grey.500' }}>
            Market Size
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

export default LongProfits;
