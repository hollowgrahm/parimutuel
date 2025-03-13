'use client'

import { Github, Twitter } from 'lucide-react'
import { 
  ThemeProvider, 
  Box, 
  Typography, 
  Container,
  Grid,
  IconButton,
  Link,
  createTheme,
  CssBaseline
} from '@mui/material'

const links = [
  { label: 'About', href: 'https://x.com/hollowgrahm' },
  { label: 'Documentation', href: 'https://x.com/hollowgrahm' },
  { label: 'GitHub', href: 'https://x.com/hollowgrahm' },
  { label: 'Terms', href: 'https://x.com/hollowgrahm' },
  { label: 'Privacy', href: 'https://x.com/hollowgrahm' }
]

const socials = [
  { icon: Github, href: 'https://x.com/hollowgrahm', name: 'GitHub' },
  { icon: Twitter, href: 'https://x.com/hollowgrahm', name: 'Twitter' }
]

const darkTheme = createTheme({
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
})

export function Footer() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ mt: 8, mb: 4 }}>
        <Box
          sx={{
            p: 4,
            background: 'transparent',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Grid container spacing={2} alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                © 2025 Parimutuel. All rights reserved.
              </Typography>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {links.map((link, index) => (
                  <Link
                    key={index}
                    href={link.href}
                    underline="none"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Box>
            </Grid>
            <Grid item>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {socials.map((social, index) => {
                  const Icon = social.icon
                  return (
                    <IconButton
                      key={index}
                      href={social.href}
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'primary.main',
                          background: 'rgba(124, 58, 237, 0.1)',
                        },
                      }}
                    >
                      <Icon size={20} />
                    </IconButton>
                  )
                })}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </ThemeProvider>
  )
} 