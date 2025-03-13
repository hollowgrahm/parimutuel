'use client'

import { Medal, Vote, ArrowLeftRight, Coins, Settings, Timer } from 'lucide-react'
import { 
  Box, 
  Typography, 
  Container,
  Paper
} from '@mui/material'
import { motion } from 'framer-motion'
import { SectionTitle } from '../ui/SectionTitle'

const steps = [
  {
    title: "Position Opening",
    description: "Open positions by depositing margin and selecting leverage. Your leverage multiplier determines position size and liquidation threshold, allowing for customized risk profiles.",
    icon: Settings
  },
  {
    title: "Pooled Trading",
    description: "Positions are pooled to trade collectively against the opposing side. Profits are distributed proportionally based on each trader's share of the pool.",
    icon: Vote
  },
  {
    title: "Dynamic Liquidation",
    description: "Positions are liquidated when price moves against the trader beyond their threshold. Upon liquidation, margin is distributed to the opposite side's profit pool.",
    icon: Medal
  },
  {
    title: "Profit Distribution",
    description: "Profits are shared pro-rata based on position shares. New positions pay a leverage fee relative to pool dilution, ensuring balanced position sizes.",
    icon: ArrowLeftRight
  },
  {
    title: "Funding Rate",
    description: "A funding rate mechanism balances long and short positions. Traders on the dominant side pay a fee to the minority side every 15 minutes.",
    icon: Timer
  },
  {
    title: "Market Liquidity",
    description: "No liquidity provider needed as traders directly face each other. Position leverage and funding rates create natural equilibrium.",
    icon: Coins
  }
]

export function HowItWorks() {
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
        <SectionTitle>How It Works</SectionTitle>
      </Box>
      <Box sx={{ width: '100%', mt: 4 }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          exit="hidden"
          viewport={{ once: false, amount: 0.2 }}
          variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.8,
                ease: "easeOut",
                staggerChildren: 0.1
              }
            }
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '2px',
                height: '100%',
                background: 'linear-gradient(to bottom, transparent, #7c3aed, transparent)',
                zIndex: 0,
              }}
            />
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { 
                      opacity: 1, 
                      y: 0,
                      transition: {
                        duration: 0.8,
                        ease: "easeOut"
                      }
                    }
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      mb: 6,
                      position: 'relative',
                      zIndex: 1,
                      flexDirection: index % 2 === 0 ? 'row' : 'row-reverse',
                    }}
                  >
                    <Box
                      component={motion.div}
                      whileHover={{ scale: 1.1 }}
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        background: 'rgba(124, 58, 237, 0.1)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '2px solid rgba(124, 58, 237, 0.2)',
                      }}
                    >
                      <Icon size={24} className="text-primary" />
                    </Box>
                    <Paper
                      sx={{
                        flex: 1,
                        p: 3,
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 2,
                        maxWidth: '500px',
                        position: 'relative',
                        '&:hover': {
                          background: 'rgba(255,255,255,0.04)',
                          '&::before': {
                            opacity: 1,
                          },
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: 'linear-gradient(to right, #7c3aed, #8b5cf6)',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                        },
                      }}
                    >
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          mb: 1, 
                          fontWeight: 600,
                          color: '#ffffff'
                        }}
                      >
                        {step.title}
                      </Typography>
                      <Typography 
                        sx={{ 
                          color: 'rgba(255, 255, 255, 0.8)'
                        }}
                      >
                        {step.description}
                      </Typography>
                    </Paper>
                  </Box>
                </motion.div>
              )
            })}
          </Box>
        </motion.div>
      </Box>
    </Box>
  )
} 