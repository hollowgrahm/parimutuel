'use client'

import { motion } from 'framer-motion'
import { Rocket } from 'lucide-react'
import { MatrixRain } from '../ui/matrix-rain'
import { 
  Box, 
  Typography, 
  Button as MuiButton,
  Container
} from '@mui/material'
import Link from 'next/link'

export function Hero() {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '50vh',
        py: 6,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(124, 58, 237, 0.15) 0%, rgba(9, 9, 11, 0) 70%)',
          pointerEvents: 'none',
        },
      }}
    >
      <MatrixRain />
      
      <Container maxWidth="lg">
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
          style={{
            position: 'relative',
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          <motion.div variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { 
              opacity: 1, 
              y: 0,
              transition: {
                duration: 0.8,
                ease: "easeOut"
              }
            }
          }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4.5rem' },
                fontWeight: 800,
                mb: 2,
                background: 'linear-gradient(to right, #7c3aed, #a855f7)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Parimutuel Perpetuals
            </Typography>

            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.25rem', sm: '1.5rem' },
                fontWeight: 400,
                mb: 4,
                maxWidth: '800px',
                mx: 'auto',
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              Novel and crypto native future derivatives, enabling permissionless market listings, no leverage limitations, no need for liquidity providers and zero insolvency risk.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Link href="/trade" style={{ textDecoration: 'none' }}>
                <MuiButton
                  variant="contained"
                  size="large"
                  startIcon={<Rocket />}
                  sx={{
                    background: 'linear-gradient(45deg, #7c3aed 30%, #a855f7 90%)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #6d28d9 30%, #9333ea 90%)',
                    },
                  }}
                >
                  Testnet
                </MuiButton>
              </Link>

              {/* <MuiButton
                variant="outlined"
                size="large"
                sx={{
                  borderColor: 'rgba(124, 58, 237, 0.5)',
                  color: '#fff',
                  '&:hover': {
                    borderColor: '#7c3aed',
                    background: 'rgba(124, 58, 237, 0.1)',
                  },
                }}
              >
                Learn More
              </MuiButton> */}
            </Box>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  )
} 