"use client";

import { useState, useEffect, useCallback } from "react";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import { toast } from "sonner";
import {
  Paper,
  Typography,
  TextField,
  Slider,
  Button,
  Box,
  CircularProgress,
  Stack,
  Alert,
} from "@mui/material";
import { useContract, useContractRead, useContractWrite, useAddress } from "@thirdweb-dev/react";
import { PARIMUTUEL_ABI, USD_ABI } from "../../config/contracts";
import { ContractInterface } from "ethers";
import { useContractAddresses } from "../../hooks/useContractAddresses";
import { useChainContext } from "../providers/ThirdwebProviderWrapper";

// Constants for Base Sepolia
const BASE_SEPOLIA_CHAIN_ID = 84532;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

interface Position {
  owner: string;
  margin: bigint;
  leverage: bigint;
  tokens: bigint;
  shares: bigint;
  entry: bigint;
  liquidation: bigint;
  profit: bigint;
  funding: bigint;
  active: boolean;
}

const PlaceOrder = () => {
  const { parimutuel: PARIMUTUEL_ADDRESS, usdToken: USD_TOKEN_ADDRESS } = useContractAddresses();
  const { activeChain } = useChainContext();
  const [margin, setMargin] = useState('');
  const [leverage, setLeverage] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [estimatedLeverageFeeLong, setEstimatedLeverageFeeLong] = useState<number | null>(null);
  const [estimatedLeverageFeeShort, setEstimatedLeverageFeeShort] = useState<number | null>(null);
  const [maxValidLeverage, setMaxValidLeverage] = useState(100);
  const [isCalculatingFees, setIsCalculatingFees] = useState(false);
  const [effectiveLeverageLong, setEffectiveLeverageLong] = useState<number | null>(null);
  const [effectiveLeverageShort, setEffectiveLeverageShort] = useState<number | null>(null);
  const [networkWarning, setNetworkWarning] = useState<string | null>(null);

  const address = useAddress();
  const { contract } = useContract(PARIMUTUEL_ADDRESS, PARIMUTUEL_ABI as ContractInterface);
  const { contract: usdContract } = useContract(USD_TOKEN_ADDRESS, USD_ABI as ContractInterface);

  const isBaseSepolia = activeChain?.chainId === BASE_SEPOLIA_CHAIN_ID;

  // Check if we're on Base Sepolia and show a warning
  useEffect(() => {
    if (isBaseSepolia) {
      setNetworkWarning("You're on Base Sepolia which may experience RPC issues. If transactions fail, please try again or switch to another network.");
    } else {
      setNetworkWarning(null);
    }
  }, [isBaseSepolia]);

  const { data: longPositionsData } = useContractRead(
    contract,
    "longPositions",
    []
  );

  const { data: shortPositionsData } = useContractRead(
    contract,
    "shortPositions",
    []
  );

  const longPositionData = longPositionsData?.find(
    (pos: Position) => pos.owner.toLowerCase() === address?.toLowerCase()
  );

  const shortPositionData = shortPositionsData?.find(
    (pos: Position) => pos.owner.toLowerCase() === address?.toLowerCase()
  );

  const hasActiveLong = longPositionData?.active;
  const hasActiveShort = shortPositionData?.active;

  const { data: allowance, refetch: refetchAllowance } = useContractRead(
    usdContract,
    "allowance",
    [address, PARIMUTUEL_ADDRESS]
  );

  const { mutateAsync: longOpen } = useContractWrite(
    contract,
    "longOpen"
  );

  const { mutateAsync: shortOpen } = useContractWrite(
    contract,
    "shortOpen"
  );

  const { mutateAsync: approve } = useContractWrite(
    usdContract,
    "approve"
  );

  const { data: balance, isLoading: isBalanceLoading } = useContractRead(
    usdContract,
    "balanceOf",
    [address]
  );

  const { mutateAsync: getFaucetFunds, isLoading: isFaucetLoading } = useContractWrite(
    usdContract,
    "faucet"
  );

  // Check if we need approval whenever address changes
  useEffect(() => {
    if (allowance !== undefined) {
      setNeedsApproval(BigInt(allowance.toString()) === BigInt(0));
    }
  }, [allowance]);

  // Add reads for market sizes
  const { data: shortTokens } = useContractRead(
    contract,
    "shortTokens"
  );

  const { data: longTokens } = useContractRead(
    contract,
    "longTokens"
  );

  // Add reads for market stats
  const { data: globalStats } = useContractRead(
    contract,
    "globalStats",
    []
  );

  // Function to find max valid leverage using binary search
  const findMaxValidLeverage = useCallback(async (
    marginAmount: string,
    isLong: boolean
  ): Promise<number> => {
    if (!contract || !marginAmount || isNaN(Number(marginAmount)) || !globalStats) {
      return 100; // Default max if we can't calculate
    }

    const marginInWei = parseUnits(marginAmount, 8);
    const [shortTokens, shortShares, longTokens, longShares] = globalStats;
    const marketTokens = isLong ? longTokens : shortTokens;
    const marketShares = isLong ? longShares : shortShares;
    
    // Binary search for highest valid leverage
    let low = 2;
    let high = 100;
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const positionSize = marginInWei * BigInt(mid);
      
      try {
        const positionShares = await contract.call("shares", [
          positionSize,
          marketTokens
        ]);

        const fee = await contract.call("leverageFee", [
          positionSize,
          positionShares,
          marketShares
        ]);

        // If fee is greater than margin, try lower leverage
        if (fee > marginInWei) {
          high = mid - 1;
        } else {
          // This leverage works, but there might be a higher valid one
          low = mid + 1;
        }
      } catch (error) {
        high = mid - 1;
      }
    }
    
    return high; // Return highest valid leverage
  }, [contract, globalStats]);

  // Update max leverage calculation
  useEffect(() => {
    const updateMaxLeverage = async () => {
      if (!margin) {
        setMaxValidLeverage(100);
        return;
      }

      try {
        // Get max leverage for both long and short
        const [longMax, shortMax] = await Promise.all([
          findMaxValidLeverage(margin, true),
          findMaxValidLeverage(margin, false)
        ]);

        // Use the lower of the two as the max valid leverage
        const maxLeverage = Math.min(longMax, shortMax);
        
        setMaxValidLeverage(maxLeverage);
        
        // If current leverage is higher than new max, adjust it down
        if (leverage > maxLeverage) {
          setLeverage(maxLeverage);
        }
      } catch (error) {
        console.error("Error calculating max leverage:", error);
        setMaxValidLeverage(100);
      }
    };

    updateMaxLeverage();
  }, [margin, findMaxValidLeverage]);

  // Update leverage fee calculations
  useEffect(() => {
    const calculateLeverageFees = async () => {
      if (!contract || !margin || isNaN(Number(margin)) || !globalStats) {
        setEstimatedLeverageFeeLong(null);
        setEstimatedLeverageFeeShort(null);
        setEffectiveLeverageLong(null);
        setEffectiveLeverageShort(null);
        return;
      }

      setIsCalculatingFees(true);
      try {
        // Calculate position size from margin and leverage
        const marginInWei = parseUnits(margin, 8);
        const positionSize = marginInWei * BigInt(leverage);

        // Extract market stats
        const [shortTokens, shortShares, longTokens, longShares] = globalStats;

        console.log("Calculating fees with:", {
          network: activeChain?.name || "Unknown network",
          chainId: activeChain?.chainId || "Unknown chain ID",
          margin,
          leverage,
          positionSize: positionSize.toString(),
          shortTokens: shortTokens.toString(),
          shortShares: shortShares.toString(),
          longTokens: longTokens.toString(),
          longShares: longShares.toString()
        });

        // Calculate shares for both positions
        let longPositionShares, shortPositionShares;
        try {
          longPositionShares = await contract.call("shares", [
            positionSize,
            longTokens
          ]);
          console.log("Long position shares calculated:", longPositionShares.toString());
        } catch (error) {
          console.error("Error calculating long position shares:", error);
          throw new Error("Failed to calculate long position shares");
        }

        try {
          shortPositionShares = await contract.call("shares", [
            positionSize,
            shortTokens
          ]);
          console.log("Short position shares calculated:", shortPositionShares.toString());
        } catch (error) {
          console.error("Error calculating short position shares:", error);
          throw new Error("Failed to calculate short position shares");
        }

        // Get leverage fees for both positions
        let longFee, shortFee;
        try {
          longFee = await contract.call("leverageFee", [
            positionSize,
            longPositionShares,
            longShares
          ]);
          console.log("Long fee calculated:", longFee.toString());
        } catch (error) {
          console.error("Error calculating long fee:", error);
          throw new Error("Failed to calculate long fee");
        }

        try {
          shortFee = await contract.call("leverageFee", [
            positionSize,
            shortPositionShares,
            shortShares
          ]);
          console.log("Short fee calculated:", shortFee.toString());
        } catch (error) {
          console.error("Error calculating short fee:", error);
          throw new Error("Failed to calculate short fee");
        }

        // Convert fees from wei and update state
        setEstimatedLeverageFeeLong(Number(formatUnits(longFee, 8)));
        setEstimatedLeverageFeeShort(Number(formatUnits(shortFee, 8)));

        // Calculate effective leverage for both positions
        const marginAmount = parseFloat(margin);
        const positionSizeFloat = marginAmount * leverage;

        // Calculate effective leverage: Position Size / (Margin - Fee)
        const effectiveLongLev = positionSizeFloat / (marginAmount - Number(formatUnits(longFee, 8)));
        const effectiveShortLev = positionSizeFloat / (marginAmount - Number(formatUnits(shortFee, 8)));

        setEffectiveLeverageLong(effectiveLongLev);
        setEffectiveLeverageShort(effectiveShortLev);

      } catch (error) {
        console.error(`Error calculating leverage fees on ${activeChain?.name || "Unknown network"}:`, error);
        // Log more detailed error information
        if (error instanceof Error) {
          console.error("Error message:", error.message);
          console.error("Error stack:", error.stack);
        }
        
        setEstimatedLeverageFeeLong(null);
        setEstimatedLeverageFeeShort(null);
        setEffectiveLeverageLong(null);
        setEffectiveLeverageShort(null);
      } finally {
        setIsCalculatingFees(false);
      }
    };

    calculateLeverageFees();
  }, [contract, margin, leverage, globalStats, activeChain]);

  // Retry function with exponential backoff for Base Sepolia
  const executeWithRetry = async (
    operation: () => Promise<any>,
    retryCount = 0
  ): Promise<any> => {
    try {
      return await operation();
    } catch (error: any) {
      // Only retry for Base Sepolia and specific RPC errors
      if (
        isBaseSepolia && 
        retryCount < MAX_RETRIES && 
        (error?.message?.includes("Internal JSON-RPC error") || 
         error?.message?.includes("execution reverted") ||
         error?.message?.includes("transaction underpriced"))
      ) {
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
        console.log(`Retrying operation in ${backoffTime}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        // Show toast for retry
        toast.info(`Transaction failed. Retrying in ${backoffTime/1000} seconds...`);
        
        // Wait for backoff period
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        // Retry with incremented counter
        return executeWithRetry(operation, retryCount + 1);
      }
      
      // If we've exhausted retries or it's not a retryable error, rethrow
      throw error;
    }
  };

  const handleOrder = async (type: 'long' | 'short') => {
    if (!margin || isNaN(Number(margin)) || Number(margin) <= 0) {
      toast.error("Please enter a valid margin amount.");
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setIsProcessing(true);
    try {
      // Use parseUnits for consistent conversion
      const marginInWei = parseUnits(margin, 8).toString();
      const leverageInWei = parseUnits(leverage.toString(), 8).toString();
      
      console.log('Sending to contract:', {
        user: address,
        margin: marginInWei,
        leverage: leverageInWei,
        marginOriginal: margin,
        leverageOriginal: leverage,
        network: activeChain?.name,
        chainId: activeChain?.chainId
      });

      // Use the retry mechanism for Base Sepolia
      if (type === 'long') {
        const tx = await executeWithRetry(() => 
          longOpen({ 
            args: [
              address,
              marginInWei,
              leverageInWei
            ],
            // For Base Sepolia, we'll increase gas limit and price slightly
            overrides: isBaseSepolia ? {
              gasLimit: 3000000, // Increase gas limit
            } : undefined
          })
        );
        await tx.receipt;
        toast.success("Long position opened successfully!");
      } else {
        const tx = await executeWithRetry(() => 
          shortOpen({ 
            args: [
              address,
              marginInWei,
              leverageInWei
            ],
            // For Base Sepolia, we'll increase gas limit and price slightly
            overrides: isBaseSepolia ? {
              gasLimit: 3000000, // Increase gas limit
            } : undefined
          })
        );
        await tx.receipt;
        toast.success("Short position opened successfully!");
      }
      setMargin('');
      setLeverage(1);
    } catch (error: any) {
      let errorMessage = "An error occurred while placing the order.";
      
      if (error?.message) {
        // Handle BigInt serialization in the error message
        const message = error.message.replace(/BigInt\((.*?)\)/g, '$1');
        
        if (message.includes("execution reverted:")) {
          errorMessage = message.split("execution reverted:")[1].trim();
        } else if (message.includes("Internal JSON-RPC error")) {
          errorMessage = "Network connection issue. Please try again later.";
          if (isBaseSepolia) {
            errorMessage += " Base Sepolia may be experiencing RPC issues.";
          }
        } else {
          errorMessage = message;
        }
      }
      
      toast.error(errorMessage);
      // Safely log the error by converting BigInt to string
      console.error("Full error:", JSON.stringify(error, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!address) {
      toast.error("Please connect your wallet first.");
      return;
    }

    setIsProcessing(true);
    try {
      // Use the retry mechanism for Base Sepolia
      const tx = await executeWithRetry(() => 
        approve({ 
          args: [PARIMUTUEL_ADDRESS, maxUint256],
          // For Base Sepolia, we'll increase gas limit slightly
          overrides: isBaseSepolia ? {
            gasLimit: 100000, // Increase gas limit for approvals
          } : undefined
        })
      );
      await tx.receipt;
      await refetchAllowance();
      toast.success("Token approval successful!");
    } catch (error: any) {
      let errorMessage = "Failed to approve token spending.";
      
      if (error?.message) {
        if (error.message.includes("Internal JSON-RPC error")) {
          errorMessage = "Network connection issue. Please try again later.";
          if (isBaseSepolia) {
            errorMessage += " Base Sepolia may be experiencing RPC issues.";
          }
        }
      }
      
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGetFunds = async () => {
    try {
      // Use the retry mechanism for Base Sepolia
      const tx = await executeWithRetry(() => 
        getFaucetFunds({ 
          args: [],
          // For Base Sepolia, we'll increase gas limit slightly
          overrides: isBaseSepolia ? {
            gasLimit: 100000, // Increase gas limit for faucet
          } : undefined
        })
      );
      await tx.receipt;
      toast.success("Successfully received funds from faucet!");
    } catch (error) {
      console.error("Error getting funds:", error);
      toast.error("Failed to get funds from faucet");
    }
  };

  const formatNumberWithCommas = (number: number) => {
    return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Add a styled info section component
  const InfoSection = ({ label, value, loading, color = 'text.secondary' }: {
    label: string;
    value: React.ReactNode;
    loading?: boolean;
    color?: string;
  }) => (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Typography sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography sx={{ color, fontWeight: 'bold' }}>
        {loading ? (
          <CircularProgress size={16} sx={{ ml: 1, verticalAlign: 'middle' }} />
        ) : value}
      </Typography>
    </Box>
  );

  // Early return if both positions are active
  if (hasActiveLong && hasActiveShort) {
    return null;
  }

  return (
    <Paper 
      sx={{ 
        bgcolor: '#1a1b1e',
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 3,
        position: 'relative',
      }}
    >
      {/* Loading overlay */}
      {isProcessing && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            zIndex: 10
          }}
        >
          <CircularProgress size={48} sx={{ color: 'white' }} />
        </Box>
      )}

      <Typography variant="h6" color="text.primary" sx={{ mb: 2 }}>
        Place Order
      </Typography>

      {/* Network warning for Base Sepolia */}
      {networkWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {networkWarning}
        </Alert>
      )}

      {/* Add balance check */}
      {!isBalanceLoading && balance && parseFloat(formatUnits(balance, 8)) < 1000 ? (
        <Box sx={{ textAlign: 'center' }}>
          <Typography color="error" sx={{ mb: 2 }}>
            Insufficient funds to trade. Get some test funds to start trading.
          </Typography>
          <Button
            variant="contained"
            onClick={handleGetFunds}
            disabled={isFaucetLoading}
            fullWidth
            sx={{
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            {isFaucetLoading ? 'Getting Funds...' : 'Get Test Funds'}
          </Button>
        </Box>
      ) : (
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
            <TextField
              type="number"
              placeholder="Margin (USD)"
              value={margin}
              onChange={(e) => {
                // Allow only numbers with up to 2 decimal places
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                  setMargin(value);
                }
              }}
              disabled={isProcessing}
              fullWidth
              variant="outlined"
              InputProps={{
                sx: { 
                  bgcolor: 'background.paper',
                  '& input': {
                    color: 'text.primary'
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'divider'
                  }
                }
              }}
            />
            <Typography variant="h6" color="text.primary" sx={{ whiteSpace: 'nowrap' }}>
              Leverage: {leverage}x
            </Typography>
          </Box>

          <Slider
            min={2}
            max={100}
            step={1}
            value={leverage}
            onChange={(_, value) => setLeverage(value as number)}
            disabled={isProcessing}
            sx={{
              color: 'primary.main',
              '& .MuiSlider-thumb': {
                bgcolor: 'white'
              }
            }}
          />

          {/* Update the display section in the component */}
          <Box 
            sx={{ 
              bgcolor: '#0a0b0e',
              borderRadius: 1,
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <InfoSection
              label="Position Size"
              value={`$${margin ? formatNumberWithCommas(parseFloat(margin) * leverage) : '0.00'}`}
              color="primary.main"
            />
            
            {!hasActiveLong && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'success.main', mb: 1 }}>
                  Long Position Details
                </Typography>
                <InfoSection
                  label="Estimated Fee"
                  value={estimatedLeverageFeeLong !== null ? `$${formatNumberWithCommas(estimatedLeverageFeeLong)}` : '-'}
                  loading={isCalculatingFees}
                />
                <InfoSection
                  label="Effective Leverage (After Fee)"
                  value={effectiveLeverageLong !== null ? `${formatNumberWithCommas(effectiveLeverageLong)}x` : '-'}
                  loading={isCalculatingFees}
                  color="success.main"
                />
              </Box>
            )}

            {!hasActiveShort && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'error.main', mb: 1 }}>
                  Short Position Details
                </Typography>
                <InfoSection
                  label="Estimated Fee"
                  value={estimatedLeverageFeeShort !== null ? `$${formatNumberWithCommas(estimatedLeverageFeeShort)}` : '-'}
                  loading={isCalculatingFees}
                />
                <InfoSection
                  label="Effective Leverage (After Fee)"
                  value={effectiveLeverageShort !== null ? `${formatNumberWithCommas(effectiveLeverageShort)}x` : '-'}
                  loading={isCalculatingFees}
                  color="error.main"
                />
              </Box>
            )}
          </Box>

          {needsApproval ? (
            <Button
              fullWidth
              variant="contained"
              onClick={handleApprove}
              disabled={isProcessing}
              sx={{ 
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
                py: 1,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              Approve Token Spending
            </Button>
          ) : (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {!hasActiveShort && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleOrder('short')}
                  disabled={isProcessing}
                  sx={{ 
                    bgcolor: 'error.main',
                    '&:hover': { bgcolor: 'error.dark' },
                    py: 1,
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Open Short
                </Button>
              )}
              {!hasActiveLong && (
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleOrder('long')}
                  disabled={isProcessing}
                  sx={{ 
                    bgcolor: 'success.main',
                    '&:hover': { bgcolor: 'success.dark' },
                    py: 1,
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Open Long
                </Button>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Paper>
  );
};

export default PlaceOrder;
