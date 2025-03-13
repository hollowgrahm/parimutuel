'use client';

import { AppBar, Box, Container, Toolbar, Button, GlobalStyles, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';
import { ConnectWallet } from "@thirdweb-dev/react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChainContext } from '../providers/ThirdwebProviderWrapper';

const navItems = [
  { label: 'Trade', path: '/trade' },
];

export function Navigation() {
  const pathname = usePathname();
  const { activeChain, setActiveChain, supportedChains } = useChainContext();

  const handleChainChange = (event: SelectChangeEvent<number>) => {
    const selectedChainId = Number(event.target.value);
    const chain = supportedChains.find(c => c.chainId === selectedChainId);
    if (chain) setActiveChain(chain);
  };

  return (
    <>
      <GlobalStyles
        styles={{
          '::selection': {
            backgroundColor: 'rgba(149, 64, 255, 0.3)',
            color: '#ffffff',
          },
          '::-moz-selection': {
            backgroundColor: 'rgba(149, 64, 255, 0.3)',
            color: '#ffffff',
          },
        }}
      />
      <AppBar 
        position="sticky" 
        sx={{ 
          background: 'rgba(10, 10, 15, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease-in-out'
        }}
      >
        <Container maxWidth="xl">
          <Toolbar 
            disableGutters 
            sx={{ 
              justifyContent: 'space-between',
              margin: '0 auto',
              width: '100%',
              maxWidth: '1200px',
              py: 1
            }}
          >
            <Link href="/" passHref style={{ textDecoration: 'none' }}>
              <Button
                sx={{
                  color: '#ffffff',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  letterSpacing: '.3rem',
                  position: 'relative',
                  '&:hover': {
                    color: '#9540FF',
                    background: 'transparent',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.2s ease-in-out',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    width: '0%',
                    height: '2px',
                    bottom: 0,
                    left: '50%',
                    background: '#9540FF',
                    transition: 'all 0.3s ease-in-out',
                  },
                  '&:hover::after': {
                    width: '80%',
                    left: '10%',
                  }
                }}
              >
                PARIMUTUEL
              </Button>
            </Link>

            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {navItems.map((item) => (
                <Link key={item.path} href={item.path} passHref style={{ textDecoration: 'none' }}>
                  <Button
                    sx={{
                      color: pathname === item.path ? '#9540FF' : '#ffffff',
                      fontSize: '1rem',
                      fontWeight: 500,
                      position: 'relative',
                      '&:hover': {
                        color: '#B47AFF',
                        background: 'transparent',
                        transform: 'translateY(-2px)',
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        width: pathname === item.path ? '80%' : '0%',
                        height: '2px',
                        bottom: 0,
                        left: pathname === item.path ? '10%' : '50%',
                        background: '#9540FF',
                        transition: 'all 0.3s ease-in-out',
                      },
                      '&:hover::after': {
                        width: '80%',
                        left: '10%',
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
              
              {/* Chain Selector */}
              <FormControl 
                size="small" 
                sx={{ 
                  minWidth: 150,
                  '& .MuiOutlinedInput-root': {
                    color: '#ffffff',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                    },
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.23)',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9540FF',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#9540FF',
                    },
                  },
                  '& .MuiSelect-icon': {
                    color: '#9540FF',
                  },
                }}
              >
                <Select
                  value={activeChain.chainId}
                  onChange={handleChainChange}
                  displayEmpty
                  sx={{
                    backgroundColor: 'rgba(20, 20, 25, 0.8)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        backgroundColor: 'rgba(20, 20, 25, 0.95)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
                        '& .MuiMenuItem-root': {
                          color: '#ffffff',
                          '&:hover': {
                            backgroundColor: 'rgba(149, 64, 255, 0.1)',
                          },
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(149, 64, 255, 0.2)',
                            '&:hover': {
                              backgroundColor: 'rgba(149, 64, 255, 0.3)',
                            }
                          }
                        }
                      }
                    }
                  }}
                >
                  {supportedChains.map((chain) => (
                    <MenuItem key={chain.chainId} value={chain.chainId} selected={chain.chainId === activeChain.chainId}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: chain.chainId === activeChain.chainId ? '#9540FF' : 'rgba(255, 255, 255, 0.5)',
                          }}
                        />
                        {chain.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Box sx={{ 
                p: 1,
                '.custom-connect-wallet-button': {
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }
                }
              }}>
                <ConnectWallet
                  theme="dark"
                  btnTitle="Connect Wallet"
                  className="custom-connect-wallet-button"
                  hideTestnetFaucet={false}
                  switchToActiveChain={true}
                />
              </Box>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    </>
  );
} 