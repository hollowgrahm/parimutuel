"use client";

import { Box, Grid, Container, Stack, Alert, Typography } from "@mui/material";
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import CurrentPrice from "./CurrentPrice";
import PriceFeeds from "./PriceFeeds";
import PlaceOrder from "./PlaceOrder";
import PositionsTable from "./PositionsTable";
import TradingView from "./TradingView";
import UserBalance from "./UserBalance";
import { PositionInfo } from "./PositionInfo";
import { useContract } from "@thirdweb-dev/react";
import { PARIMUTUEL_ABI } from "../../config/contracts";
import { ContractInterface } from "ethers";
import { useAddress } from "@thirdweb-dev/react";
import MarketStats from "./MarketStats";
import { useContractAddresses } from "../../hooks/useContractAddresses";
import { useChainContext } from "../../components/providers/ThirdwebProviderWrapper";
import { Footer } from "../footer/footer";

export default function TradingInterface() {
  const { parimutuel: PARIMUTUEL_ADDRESS } = useContractAddresses();
  const { contract } = useContract(PARIMUTUEL_ADDRESS, PARIMUTUEL_ABI as ContractInterface);
  const address = useAddress();
  const { activeChain } = useChainContext();
  
  // Check if the current chain is Monad Testnet
  const isMonadChain = activeChain.chainId === 10143;

  // Removed redundant useContractRead hooks for position data
  // Child components will handle their own data fetching

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="xl" disableGutters sx={{ bgcolor: 'transparent' }}>
        <Grid 
          container 
          spacing={1}
          sx={{ 
            p: 1,
            m: 0,
            width: '100%',
            bgcolor: 'transparent',
            '& .MuiGrid-item': {
              display: 'flex',
              p: '4px !important',
              m: 0,
              boxSizing: 'border-box',
              '& > *': {
                width: '100%',
                maxWidth: '100%',
                bgcolor: 'transparent',
                borderRadius: 1,
              }
            },
            '& .MuiTypography-h6': {
              fontSize: '1rem',
            },
            '& .MuiTypography-body1': {
              fontSize: '0.875rem',
            },
            '& .MuiTypography-body2': {
              fontSize: '0.8rem',
            },
            '& .MuiTypography-h4, & .MuiTypography-h5': {
              fontSize: '1.1rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            },
            '& .MuiTableCell-root': {
              fontSize: '0.8rem',
              padding: '4px 6px',
            },
            '& *': {
              fontSize: '0.875rem',
            }
          }}
        >
          {/* Monad Chain Banner */}
          {isMonadChain && (
            <Grid item xs={12} sx={{ px: '0 !important', mx: '0 !important' }}>
              <Alert 
                severity="info" 
                sx={{ 
                  bgcolor: '#9540FF !important', 
                  color: 'white',
                  '& .MuiAlert-icon': {
                    color: 'white'
                  },
                  '& .MuiAlert-message': {
                    width: '100%'
                  },
                  borderRadius: 1,
                  mb: 1,
                  boxShadow: '0 4px 12px rgba(149, 64, 255, 0.3)',
                  padding: '12px 16px'
                }}
              >
                <Typography variant="body2" sx={{ 
                  color: 'white',
                  fontSize: '0.95rem',
                  lineHeight: 1.5
                }}>
                  Due to $MON gas availability limitations the liquidation and funding engines might be lagging at times on the Monad Testnet. 
                  If you would like to support the project you can do so by donating $MON to 0x9b7e5d40fCb79bbF4171521F5a8e2e15808f82D7 so we can improve performance.
                  Thank you for understanding and enjoy the Monad Testnet!
                  <br />
                  - Engine is currently out of gas, please use the Base Sepolia Testnet for now.
                </Typography>
              </Alert>
            </Grid>
          )}

          {/* Row 1 - PriceFeeds */}
          <Grid item xs={12} sx={{
            px: '0 !important',
            mx: '0 !important',
            '& > *': {
              width: '100%',
              '& > *': {
                mx: '-8px',
                width: 'calc(100% + 16px)',
                '& .MuiTypography-root': {
                  fontSize: '1.1rem !important'
                }
              }
            }
          }}>
            <Box sx={{ 
              height: '40px',
              bgcolor: 'transparent',
              '& > *, & > * > *, & .MuiPaper-root': { 
                bgcolor: 'transparent !important',
                boxShadow: 'none'
              }
            }}>
              <PriceFeeds />
            </Box>
          </Grid>

          {/* Row 2 - Stats */}
          <Grid item xs={12} sm={6} md={2} sx={{ 
            '& > *': { 
              display: 'flex !important',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minHeight: '130px'
            }
          }}>
            <CurrentPrice />
          </Grid>
          <Grid item xs={12} sm={12} md={8} sx={{
            '& > *': {
              minHeight: '130px'
            }
          }}>
            <MarketStats />
          </Grid>
          <Grid item xs={12} sm={6} md={2} sx={{ 
            '& > *': { 
              display: 'flex !important',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              minHeight: '130px'
            }
          }}>
            <UserBalance />
          </Grid>

          {/* Row 3 - Trading */}
          <Grid 
            container 
            item 
            xs={12} 
            sx={{ 
              alignItems: 'stretch',
              m: 0,
              p: '4px !important',
              '& .MuiGrid-item': {
                p: 1,
                '&:first-of-type': {
                  pl: '0 !important',
                },
                '&:last-child': {
                  pr: '0 !important',
                }
              }
            }}
          >
            <Grid item xs={12} md={8} sx={{
              height: '100%',
            }}>
              <Box sx={{ 
                minHeight: '500px',
              }}>
                <TradingView />
              </Box>
            </Grid>
            <Grid item xs={12} md={4} sx={{ 
              bgcolor: 'transparent',
              display: 'flex',
              '& .MuiPaper-root': {
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                m: 0,
                bgcolor: 'transparent',
              }
            }}>
              <Stack 
                direction="column"
                spacing={0.5}
                sx={{ 
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  bgcolor: 'transparent',
                  gap: '2px',
                  '& > .MuiBox-root': {
                    display: 'block',
                    width: '100%',
                    '& > *': {
                      width: '100%',
                      display: 'block'
                    }
                  }
                }}
              >
                {/* Let PlaceOrder handle its own conditional rendering */}
                <Box>
                  <PlaceOrder />
                </Box>
                {/* Let PositionInfo components handle their own conditional rendering */}
                <Box>
                  <PositionInfo type="long" />
                </Box>
                <Box>
                  <PositionInfo type="short" />
                </Box>
              </Stack>
            </Grid>
          </Grid>

          {/* Row 4 - Positions */}
          <Grid item xs={12}>
            <Box sx={{ 
              bgcolor: 'transparent',
              '& .MuiPaper-root': {
                bgcolor: 'transparent',
                boxShadow: 'none'
              }
            }}>
              {/* Let PositionsTable handle its own data fetching */}
              <PositionsTable />
            </Box>
          </Grid>
        </Grid>
        
        {/* Footer */}
        <Footer />
      </Container>
    </ThemeProvider>
  );
}
