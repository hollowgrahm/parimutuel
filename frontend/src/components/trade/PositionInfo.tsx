"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { formatUnits, parseUnits } from "viem";
import { toast } from "sonner";
import {
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  CircularProgress,
  Grid,
  Stack,
} from "@mui/material";
import { useContract, useContractRead, useContractWrite, useAddress } from "@thirdweb-dev/react";
import { PARIMUTUEL_ABI } from "../../config/contracts";
import { ContractInterface } from "ethers";
import { useContractAddresses } from "../../hooks/useContractAddresses";

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
  value: bigint;
}

function calculateCountdown(fundingTimestamp: bigint): string {
  const now = Date.now();
  const distance = Number(fundingTimestamp) * 1000 - now;

  if (distance <= 0) {
    const overdueTime = Math.abs(distance);
    const totalMinutes = Math.floor(overdueTime / (1000 * 60));
    const seconds = Math.floor((overdueTime % (1000 * 60)) / 1000);
    return `-${totalMinutes}m ${seconds}s`;
  }

  const totalMinutes = Math.floor(distance / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  return `${totalMinutes}m ${seconds}s`;
}

// Add InfoSection component at the top level
const InfoSection = ({ label, value, color = 'white' }: {
  label: string;
  value: React.ReactNode;
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
    <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
      {label}
    </Typography>
    <Typography sx={{ color, fontWeight: 'bold', fontSize: '0.875rem' }}>
      {value}
    </Typography>
  </Box>
);

interface PositionInfoProps {
  type: 'long' | 'short';
}

function PositionInfo({ type }: PositionInfoProps) {
  const { parimutuel: PARIMUTUEL_ADDRESS } = useContractAddresses();
  const { contract } = useContract(PARIMUTUEL_ADDRESS, PARIMUTUEL_ABI as ContractInterface);
  const address = useAddress();
  const [positionValue, setPositionValue] = useState<string | null>(null);
  const [fundingCountdown, setFundingCountdown] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [marginAmount, setMarginAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Update contract reads to use shortPositions and longPositions
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

  // Add back the contract write hooks
  const { mutateAsync: closePosition } = useContractWrite(
    contract,
    type === 'long' ? "longClose" : "shortClose"
  );

  const { mutateAsync: addMargin } = useContractWrite(
    contract,
    type === 'long' ? "longAddMargin" : "shortAddMargin"
  );

  // Find the user's position from the positions array
  const longPositionData = longPositionsData?.find(
    (pos: Position) => pos.owner.toLowerCase() === address?.toLowerCase()
  );

  const shortPositionData = shortPositionsData?.find(
    (pos: Position) => pos.owner.toLowerCase() === address?.toLowerCase()
  );

  // Update active position checks
  const hasActiveLong = longPositionData?.active;
  const hasActiveShort = shortPositionData?.active;

  // Select the appropriate position based on type
  const activePosition = type === 'long' ? longPositionData : shortPositionData;
  const isActive = type === 'long' ? hasActiveLong : hasActiveShort;

  // Update position value when position data changes
  useEffect(() => {
    if (activePosition) {
      setPositionValue(formatUnits(activePosition.margin.toString(), 8));
    }
  }, [activePosition]);

  // Add countdown timer effect
  useEffect(() => {
    if (!activePosition) return;

    const updateCountdown = () => {
      setFundingCountdown(calculateCountdown(activePosition.funding));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [activePosition]);

  // Return null if no active position of the specified type
  if (!isActive) {
    return null;
  }

  const formatNumberWithCommas = (number: number) => {
    return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  console.log(`Rendering ${type} position:`, activePosition);

  const isProfit = positionValue && parseFloat(positionValue) > Number(formatUnits(activePosition.margin, 8));

  return (
    <Paper 
      sx={{ 
        position: 'relative',
        bgcolor: '#1a1b1e',
        width: '350px',
        minHeight: '400px',
        margin: '0 auto',
        padding: 2.5,
        borderRadius: 2,
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Position header with improved styling */}
      <Box 
        display="flex" 
        flexDirection="column"
        mb={2}
        pb={2}
        sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography 
            variant="h6" 
            sx={{ 
              color: type === 'long' ? '#4caf50' : '#f44336',
              fontWeight: 'bold',
              fontSize: '1.1rem',
            }}
          >
            {type === 'long' ? 'Long Position' : 'Short Position'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Status: <Box component="span" sx={{ 
              color: '#4caf50',
              fontWeight: 'medium'
            }}>
              Active
            </Box>
          </Typography>
        </Box>
      </Box>

      {isProcessing && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            zIndex: 10
          }}
        >
          <CircularProgress size={48} sx={{ color: 'white' }} />
        </Box>
      )}

      <Box>
        <Box sx={{ 
          bgcolor: '#0a0b0e', 
          borderRadius: 1,
          p: 1.5,
        }}>
          <InfoSection
            label="Margin"
            value={`$${formatNumberWithCommas(parseFloat(formatUnits(activePosition.margin, 8)))}`}
          />
          <InfoSection
            label="Value"
            value={`$${formatNumberWithCommas(parseFloat(formatUnits(activePosition.value, 8)))}`}
            color={parseFloat(formatUnits(activePosition.value, 8)) >= 10000 ? '#4caf50' : '#f44336'}
          />
          <InfoSection
            label="Size"
            value={`$${formatNumberWithCommas(parseFloat(formatUnits(activePosition.tokens, 8)))}`}
          />
          <InfoSection
            label="Entry Price"
            value={`$${formatNumberWithCommas(parseFloat(formatUnits(activePosition.entry, 8)))}`}
          />
          <InfoSection
            label="Leverage"
            value={`${formatNumberWithCommas(parseFloat(formatUnits(activePosition.leverage, 8)))}x`}
          />
          <InfoSection
            label="Liquidation"
            value={`$${formatNumberWithCommas(parseFloat(formatUnits(activePosition.liquidation, 8)))}`}
            color="#f44336"
          />
          <InfoSection
            label="Next Funding"
            value={fundingCountdown}
            color={fundingCountdown.startsWith('-') ? '#f44336' : '#4caf50'}
          />
        </Box>
      </Box>

      <Stack direction="row" spacing={2} justifyContent="center" mt={2}>
        <Button
          variant="contained"
          color="success"
          onClick={() => setIsDialogOpen(true)}
          disabled={isProcessing}
          fullWidth
          sx={{ 
            py: 1,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            bgcolor: 'success.main',
            color: 'white',
            '&:hover': { 
              bgcolor: 'success.dark' 
            }
          }}
        >
          Add Margin
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={async () => {
            setIsProcessing(true);
            try {
              const tx = await closePosition({ args: [address] });
              await tx.receipt;
              toast.success("Position closed successfully!");
            } catch (error) {
              console.error('Error closing position:', error);
              toast.error("Failed to close position.");
            } finally {
              setIsProcessing(false);
            }
          }}
          disabled={isProcessing}
          fullWidth
          sx={{ 
            py: 1,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            bgcolor: 'error.main',
            '&:hover': { 
              bgcolor: 'error.dark' 
            }
          }}
        >
          Close
        </Button>
      </Stack>

      <Dialog 
        open={isDialogOpen} 
        onClose={() => !isProcessing && setIsDialogOpen(false)}
      >
        <DialogTitle>
          Add Margin
        </DialogTitle>
        <DialogContent>
          <TextField
            type="number"
            placeholder="Enter margin amount"
            fullWidth
            value={marginAmount}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                setMarginAmount(value);
              }
            }}
            disabled={isProcessing}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsDialogOpen(false)}
            disabled={isProcessing}
            fullWidth
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={async () => {
              setIsProcessing(true);
              try {
                const marginInWei = parseUnits(marginAmount, 8).toString();
                const tx = await addMargin({ args: [marginInWei] });
                await tx.receipt;
                toast.success("Margin added successfully!");
                setIsDialogOpen(false);
              } catch (error) {
                console.error('Error adding margin:', error);
                toast.error("Failed to add margin.");
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={isProcessing}
            fullWidth
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

export { PositionInfo };
