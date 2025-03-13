'use client'

import { motion } from 'framer-motion'
import { Scale, Vote, PlusCircle, Trophy } from 'lucide-react'
import { 
  Box, 
  Typography, 
  Grid,
  Paper,
  Container
} from '@mui/material'
import { SectionTitle } from '../ui/SectionTitle'

const features = [
  {
    icon: Scale,
    title: 'Unlimited Leverage',
    description: 'Using a constant product price discovery mechanism, leverage is not restricted by liquidity providers or risk management systems, allowing for unlimited leverage potential.'
  },
  {
    icon: PlusCircle,
    title: 'Pooled Positions',
    description: 'Positions are pooled to trade collectively against the opposing side, with profits distributed proportionally based on capital wagered.'
  },
  {
    icon: Vote,
    title: 'Dynamic Liquidation',
    description: 'Liquidation thresholds adjust dynamically, reducing reliance on rigid LP constraints and risk management systems.'
  },
  {
    icon: Trophy,
    title: 'Zero Counterparty Risk',
    description: 'Unlike traditional perpetuals, by introducing parimutuel mechanics there is no risk of platform insolvency or bad debt to be sociliazed to the users.'
  }
]

export function KeyFeatures() {
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
        <SectionTitle>Key Features</SectionTitle>
      </Box>
      <Box sx={{ width: '100%', mt: 4 }}>
        <Grid 
          container 
          spacing={4}
          component={motion.div}
          initial="hidden"
          whileInView="visible"
          exit="hidden"
          viewport={{ once: false }}
          variants={{ 
            visible: {
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Grid 
                item 
                xs={12} 
                md={6} 
                lg={3} 
                key={index}
                component={motion.div}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    height: '100%',
                    p: 4,
                    borderRadius: 4,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderColor: 'rgba(124, 58, 237, 0.4)',
                      '& .MuiBox-root.gradient-bg': {
                        opacity: 1,
                      },
                      '& .feature-icon': {
                        color: '#7c3aed',
                        transform: 'scale(1.1)',
                      },
                    },
                  }}
                >
                  <Box
                    className="gradient-bg"
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(168, 85, 247, 0.15))',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                    }}
                  />
                  
                  <Box sx={{ position: 'relative' }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 3,
                        bgcolor: 'rgba(124, 58, 237, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <Icon 
                        className="feature-icon" 
                        style={{ 
                          width: 24, 
                          height: 24,
                          color: 'rgba(255, 255, 255, 0.8)',
                          transition: 'all 0.3s ease',
                        }} 
                      />
                    </Box>

                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 'bold',
                        mb: 1,
                        color: '#ffffff',
                      }}
                    >
                      {feature.title}
                    </Typography>

                    <Typography 
                      variant="body2" 
                      sx={{
                        lineHeight: 1.6,
                        color: 'rgba(255, 255, 255, 0.8)',
                      }}
                    >
                      {feature.description}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    </Box>
  )
} 