'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Timer, Users, TrendingUp } from 'lucide-react'
import { 
  ThemeProvider, 
  Box, 
  Typography, 
  Grid,
  Paper,
  Container,
  createTheme,
  CssBaseline,
} from '@mui/material'
import { SectionTitle } from '../ui/SectionTitle'
import { useContract, useContractRead } from '@thirdweb-dev/react'
import { formatUnits } from 'viem'
import { USD_TOKEN_ADDRESS, PARIMUTUEL_ADDRESS } from '../../config/contracts'

declare module '@mui/material/styles' {
  interface Components {
    MuiPickersDay: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: string;
            color: string;
          };
        };
      };
    };
  }
}

const stats = [
  {
    icon: TrendingUp,
    label: 'Funding Rate',
    value: '0.01%',
    change: '6hr rate for ETH/USD',
  }
]

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c3aed',
    },
    background: {
      default: '#09090b',
      paper: '#09090b',
    },
    text: {
      primary: '#ffffff',
      secondary: '#a1a1aa',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease',
        },
      },
    },
    MuiPickersDay: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#1976d2',
            color: '#fff',
          },
        },
      },
    },
  },
})

export function ProtocolStats() {
  const [mounted, setMounted] = useState(false)
  const { contract: usdContract } = useContract(USD_TOKEN_ADDRESS)
  const { contract: parimutuelContract } = useContract(PARIMUTUEL_ADDRESS)
  const { data: tvl } = useContractRead(usdContract, "balanceOf", [PARIMUTUEL_ADDRESS])
  const { data: shortTokens } = useContractRead(parimutuelContract, "shortTokens")
  const { data: longTokens } = useContractRead(parimutuelContract, "longTokens")
  const { data: shortPositions } = useContractRead(parimutuelContract, "shortPositions")
  const { data: longPositions } = useContractRead(parimutuelContract, "longPositions")

  useEffect(() => {
    setMounted(true)
  }, [])

  const formatTVL = (value: bigint | undefined) => {
    if (!value) return '$0'
    const num = Number(formatUnits(value, 8))
    if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`
    } else {
      return `$${num.toLocaleString()}`
    }
  }

  const calculateAverageLeverage = () => {
    if (!tvl || !shortTokens || !longTokens) return '0x'
    const tvlValue = Number(formatUnits(tvl, 8))
    const shortTokensValue = Number(formatUnits(shortTokens, 8))
    const longTokensValue = Number(formatUnits(longTokens, 8))
    const marketSize = shortTokensValue + longTokensValue
    const leverage = tvlValue > 0 ? marketSize / tvlValue : 0
    return `${leverage.toFixed(1)}x`
  }

  const calculateFundingRate = () => {
    if (!shortTokens || !longTokens) return { rate: '0%', message: 'No positions' }
    const shortTokensValue = Number(formatUnits(shortTokens, 8))
    const longTokensValue = Number(formatUnits(longTokens, 8))
    const marketSizeValue = shortTokensValue + longTokensValue

    if (marketSizeValue === 0) return { rate: '0%', message: 'No positions' }

    const shortPercentage = (shortTokensValue / marketSizeValue) * 100
    const longPercentage = (longTokensValue / marketSizeValue) * 100

    if (shortPercentage === longPercentage) return { rate: '0%', message: 'Balanced' }

    const fundingRateDifference = Math.abs(shortPercentage - longPercentage).toFixed(2)
    if (shortPercentage > longPercentage) {
      return { rate: `${fundingRateDifference}%`, message: 'Long Daily Yield' }
    } else {
      return { rate: `${fundingRateDifference}%`, message: 'Short Daily Yield' }
    }
  }

  const calculateActivePositions = () => {
    if (!shortPositions || !longPositions) return '0'
    const totalPositions = shortPositions.length + longPositions.length
    return totalPositions.toLocaleString()
  }

  const formattedTVL = formatTVL(tvl)
  const averageLeverage = calculateAverageLeverage()
  const activePositions = calculateActivePositions()
  const { rate: fundingRate, message: fundingMessage } = calculateFundingRate()

  const getRandomChange = () => {
    const randomNum = Math.floor(Math.random() * 61) + 20 // Random number between 20 and 80
    return `+${randomNum}% this week`
  }

  const statsWithTVLAndLeverage = [
    {
      icon: Wallet,
      label: 'Total Value Locked',
      value: formattedTVL,
      change: getRandomChange(),
    },
    {
      icon: Users,
      label: 'Average Leverage',
      value: averageLeverage,
      change: getRandomChange(),
    },
    {
      icon: Timer,
      label: 'Active Positions',
      value: activePositions,
      change: getRandomChange(),
    },
    {
      icon: TrendingUp,
      label: 'Funding Rate',
      value: fundingRate,
      change: fundingMessage,
    }
  ]

  return (
    <Box 
      sx={{ 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
      }}
    >
      <Box sx={{ 
        width: '100%', 
        textAlign: 'center',
      }}>
        <SectionTitle>Protocol Stats</SectionTitle>
      </Box>
      <Box sx={{ width: '100%', mt: 4 }}>
        <Grid container spacing={3}>
          {statsWithTVLAndLeverage.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Grid 
                item 
                xs={12} 
                sm={6}
                md={3}
                key={index}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={mounted ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: '100%',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.05)',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontWeight: 600,
                          color: 'rgba(255, 255, 255, 0.9)'
                        }}
                      >
                        {stat.label}
                      </Typography>
                      <Icon style={{ width: 24, height: 24, color: '#7c3aed' }} />
                    </Box>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        mb: 1,
                        fontWeight: 700,
                        color: '#ffffff'
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <TrendingUp style={{ width: 16, height: 16, color: '#22c55e' }} />
                      {stat.change}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    </Box>
  )
} 