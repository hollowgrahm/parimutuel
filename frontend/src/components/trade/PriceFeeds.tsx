"use client";

import { useState, useEffect } from "react";
import { Typography, Box, CircularProgress } from "@mui/material";
import axios from "axios";

interface MarketData {
  price_change_24h: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  price_change_percentage_30d: number;
  total_volume: number;
}

function PriceFeeds() {
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "https://api.coingecko.com/api/v3/coins/bitcoin", {
            params: {
              localization: false,
              tickers: false,
              market_data: true,
              community_data: false,
              developer_data: false,
              sparkline: false
            }
          }
        );
        
        const marketData = response.data.market_data;
        setData({
          price_change_24h: marketData.price_change_24h,
          price_change_percentage_24h: marketData.price_change_percentage_24h,
          price_change_percentage_7d: marketData.price_change_percentage_7d,
          price_change_percentage_30d: marketData.price_change_percentage_30d,
          total_volume: marketData.total_volume.usd
        });
        setError(false);
      } catch (err) {
        console.error("Error fetching price data:", err);
        setError(true);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number | undefined) => {
    if (num === undefined) return "0.00";
    return num.toFixed(2);
  };

  const formatVolume = (vol: number | undefined) => {
    if (vol === undefined) return "0.00";
    return (vol / 1e9).toFixed(2);
  };

  if (error) {
    return (
      <Box sx={{ width: '100%', bgcolor: '#000', p: 1, textAlign: 'center' }}>
        <Typography color="error">Price feed unavailable</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ width: '100%', bgcolor: '#000', p: 1, textAlign: 'center' }}>
        <CircularProgress size={20} sx={{ color: 'grey.500' }} />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        width: '100%',
        bgcolor: '#1a1b1e',
        p: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2
      }}
    >
      <Typography 
        sx={{ 
          color: (data?.price_change_24h || 0) >= 0 ? 'success.main' : 'error.main',
          fontWeight: 'bold'
        }}
      >
        24h: {(data?.price_change_24h || 0) >= 0 ? '+' : ''}
        {formatNumber(data?.price_change_24h)} ({formatNumber(data?.price_change_percentage_24h)}%)
      </Typography>

      <Typography 
        sx={{ 
          color: (data?.price_change_percentage_7d || 0) >= 0 ? 'success.main' : 'error.main',
          fontWeight: 'bold'
        }}
      >
        Week: {(data?.price_change_percentage_7d || 0) >= 0 ? '+' : ''}
        {formatNumber(data?.price_change_percentage_7d)} ({formatNumber(data?.price_change_percentage_7d)}%)
      </Typography>

      <Typography 
        sx={{ 
          color: (data?.price_change_percentage_30d || 0) >= 0 ? 'success.main' : 'error.main',
          fontWeight: 'bold'
        }}
      >
        Month: {(data?.price_change_percentage_30d || 0) >= 0 ? '+' : ''}
        {formatNumber(data?.price_change_percentage_30d)} ({formatNumber(data?.price_change_percentage_30d)}%)
      </Typography>

      <Typography 
        sx={{ 
          color: 'success.main',
          fontWeight: 'bold'
        }}
      >
        24h Vol: ${formatVolume(data?.total_volume)}B
      </Typography>
    </Box>
  );
}

export default PriceFeeds;
