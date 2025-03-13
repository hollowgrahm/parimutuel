import { Paper, Box, Typography, Grid } from "@mui/material";
import { LinearProgress, CircularProgress } from "@mui/material";
import { useContract, useContractRead } from "@thirdweb-dev/react";
import { PARIMUTUEL_ABI } from "../../config/contracts";
import { formatUnits } from "viem";
import { ContractInterface } from "ethers";
import { useMemo } from "react";
import { useContractAddresses } from "../../hooks/useContractAddresses";

export default function MarketStats() {
  const { parimutuel: PARIMUTUEL_ADDRESS } = useContractAddresses();
  const { contract } = useContract(PARIMUTUEL_ADDRESS, PARIMUTUEL_ABI as ContractInterface);

  // Distribution data (from Distribution.tsx)
  const { data: shortTokens, isLoading: isShortTokensLoading } = useContractRead(
    contract,
    "shortTokens"
  );

  const { data: longTokens, isLoading: isLongTokensLoading } = useContractRead(
    contract,
    "longTokens"
  );

  // Market Size (from MarketSize.tsx)
  const shortTokensValue = shortTokens ? BigInt(shortTokens.toString()) : BigInt(0);
  const longTokensValue = longTokens ? BigInt(longTokens.toString()) : BigInt(0);
  const marketSizeValue = shortTokensValue + longTokensValue;

  // Distribution percentages (from Distribution.tsx)
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

  // Funding Rate calculation (from FundingRate.tsx)
  let fundingRateText = "0%";
  let messageText = "";
  if (marketSizeValue !== BigInt(0) && Number(shortPercentage) !== Number(longPercentage)) {
    const fundingRateDifference = Math.abs(shortPercentage - longPercentage).toFixed(2);
    if (shortPercentage > longPercentage) {
      fundingRateText = `${fundingRateDifference}%`;
      messageText = "Long Daily Yield";
    } else {
      fundingRateText = `${fundingRateDifference}%`;
      messageText = "Short Daily Yield";
    }
  }

  // Format market size (from MarketSize.tsx)
  const formattedMarketSize = formatUnits(marketSizeValue, 8);
  const formattedMarketSizeDisplay = parseFloat(formattedMarketSize).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  );

  // Format profits (from ShortProfits.tsx and LongProfits.tsx)
  const formattedShortProfits = shortTokens 
    ? parseFloat(formatUnits(shortTokens.toString(), 8)).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    : "0";

  const formattedLongProfits = longTokens 
    ? parseFloat(formatUnits(longTokens.toString(), 8)).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    : "0";

  const loading = isShortTokensLoading || isLongTokensLoading;

  if (loading) {
    return (
      <Paper sx={{ 
        bgcolor: '#1a1b1e', 
        p: 1.5, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '120px' // Match the approximate height of the non-loading state
      }}>
        <CircularProgress size={24} />
      </Paper>
    );
  }

  return (
    <Paper sx={{ bgcolor: '#1a1b1e', p: 1.5 }}>
      {/* Market Size */}
      <Box sx={{ mb: 1, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          Open Interest
        </Typography>
        <Typography variant="h6">
          ${formattedMarketSizeDisplay}
        </Typography>
      </Box>

      {/* Distribution Bar */}
      <Box sx={{ mb: 1, position: 'relative', height: 16, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ 
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: `${shortPercentage}%`,
          bgcolor: '#ef5350',
          transition: 'width 0.5s ease-in-out'
        }} />
        <Box sx={{ 
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${longPercentage}%`,
          bgcolor: '#4caf50',
          transition: 'width 0.5s ease-in-out'
        }} />
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={1}>
        {/* Left Column - Short Profits */}
        <Grid item xs={4} sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Shorts
          </Typography>
          <Typography variant="h6">
            ${formattedShortProfits}
          </Typography>
        </Grid>

        {/* Middle Column - Funding Rate only now */}
        <Grid item xs={4} sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Funding Rate
          </Typography>
          <Typography variant="h6" color={shortPercentage > longPercentage ? '#4caf50' : '#ef5350'}>
            {fundingRateText}
          </Typography>
          {messageText && (
            <Typography variant="body2" sx={{ color: 'grey.500' }}>
              {messageText}
            </Typography>
          )}
        </Grid>

        {/* Right Column - Long Profits */}
        <Grid item xs={4} sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Longs
          </Typography>
          <Typography variant="h6">
            ${formattedLongProfits}
          </Typography>
        </Grid>
      </Grid>
    </Paper>
  );
} 