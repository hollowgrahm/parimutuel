"use client";

import { useCallback, useEffect, useState, useRef, useMemo, memo } from "react";
import { useContract, useContractRead, useSDK } from "@thirdweb-dev/react";
import { formatUnits, type Address } from "viem";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  tableCellClasses,
  styled,
  Grid,
  Box,
  Pagination,
  TableSortLabel,
} from "@mui/material";
import { PARIMUTUEL_ABI } from "../../config/contracts";
import { ethers } from "ethers";
import { useContractAddresses } from "../../hooks/useContractAddresses";
import { useChainContext } from "../providers/ThirdwebProviderWrapper";

// Add this constant
const PRECISION = BigInt(100000000); // 10^8

// Types
interface Position {
  owner: Address;
  margin: bigint;
  leverage: bigint;
  tokens: bigint;
  shares: bigint;
  activeShares: bigint;
  value: bigint;
  entry: bigint;
  liquidation: bigint;
  profit: bigint;
  funding: bigint;
  active: boolean;
}

interface GlobalState {
  shortProfits: bigint;
  shortShares: bigint;
  longProfits: bigint;
  longShares: bigint;
  currentPrice: bigint;
}

type Order = 'asc' | 'desc';
type OrderBy = 'margin' | 'value' | 'leverage' | 'tokens' | 'entry' | 'liquidation' | 'funding';

// Styled components
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: '#1a1b1e',
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: '#1a1b1e',
  },
  '&:nth-of-type(even)': {
    backgroundColor: '#15161a',
  },
  '&:hover': {
    backgroundColor: '#2a2b2e',
    cursor: 'pointer',
  },
}));

function formatAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-3)}`;
}

function formatNumber(value: bigint, decimals: number = 0, includeDollarSign: boolean = false): string {
  const formatted = formatUnits(value, 8);
  const num = parseFloat(formatted);
  
  const formattedNumber = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return includeDollarSign ? `$${formattedNumber}` : formattedNumber;
}

function calculateLeverage(
  size: bigint,
  margin: bigint,
  positionValue: bigint
): number {
  // Convert to numbers first
  const marginNum = Number(formatUnits(margin, 8));
  const positionValueNum = Number(formatUnits(positionValue, 8));
  const sizeNum = Number(formatUnits(size, 8));
  
  const totalValue = marginNum + positionValueNum;
  if (totalValue === 0) return 0;
  
  console.log('Leverage calculation:', {
    size: sizeNum,
    margin: marginNum,
    positionValue: positionValueNum,
    totalValue,
    result: sizeNum / totalValue
  });
  
  return sizeNum / totalValue;
}

function getValueColor(value: bigint): string {
  const threshold = BigInt(10000) * BigInt(100000000); // $10,000 in 8 decimal precision
  if (value >= threshold) {
    return '#4caf50'; // Green for values >= $10,000
  } else {
    return '#f44336'; // Red for values < $10,000
  }
}

interface PositionsTableProps {
  // Removed position and type props as they're no longer needed
}

function PositionsTable() {
  const { activeChain } = useChainContext();
  
  return (
    <Paper sx={{ bgcolor: '#1a1b1e', p: 3, minWidth: '1200px' }}>
      <Grid container spacing={2} sx={{ mx: 0 }}>
        <Grid item xs={6} sx={{ pl: '0 !important' }}>
          <Box>
            <Typography variant="h6" sx={{ 
              color: 'white',
              backgroundColor: '#1a1b1e',
              p: 2,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
            }}>
              Short Positions
            </Typography>
            <PositionsList type="short" />
          </Box>
        </Grid>
        <Grid item xs={6} sx={{ pr: '0 !important' }}>
          <Box>
            <Typography variant="h6" sx={{ 
              color: 'white',
              backgroundColor: '#1a1b1e',
              p: 2,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
            }}>
              Long Positions
            </Typography>
            <PositionsList type="long" />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}

// Add this function near the other utility functions at the top of the file
function calculateCountdown(fundingTimestamp: bigint): string {
  const now = Date.now();
  const distance = Number(fundingTimestamp) * 1000 - now;

  if (distance <= 0) {
    const overdueTime = Math.abs(distance);
    const minutes = Math.floor((overdueTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((overdueTime % (1000 * 60)) / 1000);
    return `-${minutes}m ${seconds}s`;
  }

  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  return `${minutes}m ${seconds}s`;
}

const PositionsList = ({ type }: { type: 'long' | 'short' }) => {
  const { parimutuel: PARIMUTUEL_ADDRESS } = useContractAddresses();
  const { activeChain } = useChainContext();
  const { contract } = useContract(PARIMUTUEL_ADDRESS, PARIMUTUEL_ABI);
  const [positions, setPositions] = useState<Position[]>([]);
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<OrderBy>('value');
  const rowsPerPage = 25;
  const [countdowns, setCountdowns] = useState<{ [owner: string]: string }>({});

  // Add back the fetchPositions function
  const fetchPositions = useCallback(async () => {
    if (!contract) return;
    try {
      const positionFunction = type === 'long' ? 'longPositions' : 'shortPositions';
      console.log(`Fetching ${type} positions on ${activeChain?.name || 'unknown network'} (${activeChain?.chainId || 'unknown chain ID'})`);
      const fetchedPositions = await contract.call(positionFunction);
      console.log(`Found ${fetchedPositions.filter((pos: Position) => pos.active).length} active ${type} positions`);
      setPositions(fetchedPositions.filter((pos: Position) => pos.active));
    } catch (error) {
      console.error(`Error fetching ${type} positions on ${activeChain?.name || 'unknown network'}:`, error);
      setPositions([]);
    }
  }, [contract, type, activeChain]);

  // Add back handleRequestSort
  const handleRequestSort = useCallback((property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  }, [order, orderBy]);

  // Add back getSortValue
  const getSortValue = useCallback((position: Position, property: OrderBy): number => {
    switch (property) {
      case 'margin':
      case 'tokens':
      case 'entry':
      case 'liquidation':
      case 'value':
        return Number(formatUnits(position[property], 8));
      case 'leverage':
        return Number(formatUnits(position.leverage, 8));
      case 'funding':
        return Number(position.funding);
      default:
        return 0;
    }
  }, []);

  // Memoize the sorting function
  const sortPositions = useCallback((posArray: Position[]) => {
    return [...posArray].sort((a, b) => {
      const aValue = getSortValue(a, orderBy);
      const bValue = getSortValue(b, orderBy);
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [order, orderBy]);

  // Memoize sorted positions
  const sortedPositions = useMemo(() => 
    sortPositions(positions), 
    [positions, sortPositions]
  );

  // Memoize visible positions
  const visiblePositions = useMemo(() => 
    sortedPositions.slice((page - 1) * rowsPerPage, page * rowsPerPage),
    [sortedPositions, page]
  );

  // Optimize countdown updates to only update active positions
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => {
        const updates: { [owner: string]: string } = {};
        visiblePositions.forEach((position) => {
          const countdown = calculateCountdown(position.funding);
          if (prev[position.owner] !== countdown) {
            updates[position.owner] = countdown;
          }
        });
        return Object.keys(updates).length ? { ...prev, ...updates } : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visiblePositions]);

  // Optimize fetch interval
  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 10000); // Reduce polling frequency
    return () => clearInterval(interval);
  }, [fetchPositions]);

  // Memoize the table row to prevent unnecessary re-renders
  const PositionTableRow = memo(({ position }: { position: Position }) => (
    <StyledTableRow>
      <StyledTableCell>{formatAddress(position.owner)}</StyledTableCell>
      <StyledTableCell align="right">
        {formatNumber(position.margin, 0, true)}
      </StyledTableCell>
      <StyledTableCell 
        align="right"
        sx={{
          color: getValueColor(position.value)
        }}
      >
        {formatNumber(position.value, 0, true)}
      </StyledTableCell>
      <StyledTableCell align="right">
        {formatNumber(position.leverage, 0)}x
      </StyledTableCell>
      <StyledTableCell align="right">{formatNumber(position.tokens, 0, true)}</StyledTableCell>
      <StyledTableCell align="right">{formatNumber(position.entry, 0, true)}</StyledTableCell>
      <StyledTableCell align="right">{formatNumber(position.liquidation, 0, true)}</StyledTableCell>
      <StyledTableCell 
        align="right"
        sx={{
          color: countdowns[position.owner]?.startsWith('-') ? '#f44336' : 'inherit'
        }}
      >
        {countdowns[position.owner] || '*|*|*|*'}
      </StyledTableCell>
    </StyledTableRow>
  ));

  // Rename to avoid confusion with the HTML table row
  PositionTableRow.displayName = 'PositionTableRow';

  return (
    <Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <StyledTableCell width="10%">Owner</StyledTableCell>
              <StyledTableCell width="12%" align="right">
                <TableSortLabel
                  active={orderBy === 'margin'}
                  direction={orderBy === 'margin' ? order : 'asc'}
                  onClick={() => handleRequestSort('margin')}
                  sx={{ '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                >
                  Margin
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell width="12%" align="right">
                <TableSortLabel
                  active={orderBy === 'value'}
                  direction={orderBy === 'value' ? order : 'asc'}
                  onClick={() => handleRequestSort('value')}
                  sx={{ '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                >
                  Value
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell width="8%" align="right">
                <TableSortLabel
                  active={orderBy === 'leverage'}
                  direction={orderBy === 'leverage' ? order : 'asc'}
                  onClick={() => handleRequestSort('leverage')}
                  sx={{ '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                >
                  Lev
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell width="12%" align="right">
                <TableSortLabel
                  active={orderBy === 'tokens'}
                  direction={orderBy === 'tokens' ? order : 'asc'}
                  onClick={() => handleRequestSort('tokens')}
                  sx={{ '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                >
                  Size
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell width="12%" align="right">
                <TableSortLabel
                  active={orderBy === 'entry'}
                  direction={orderBy === 'entry' ? order : 'asc'}
                  onClick={() => handleRequestSort('entry')}
                  sx={{ '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                >
                  Entry
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell width="12%" align="right">
                <TableSortLabel
                  active={orderBy === 'liquidation'}
                  direction={orderBy === 'liquidation' ? order : 'asc'}
                  onClick={() => handleRequestSort('liquidation')}
                  sx={{ '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                >
                  Liq
                </TableSortLabel>
              </StyledTableCell>
              <StyledTableCell width="12%" align="right">
                <TableSortLabel
                  active={orderBy === 'funding'}
                  direction={orderBy === 'funding' ? order : 'asc'}
                  onClick={() => handleRequestSort('funding')}
                  sx={{ '& .MuiTableSortLabel-icon': { color: 'white !important' } }}
                >
                  Funding
                </TableSortLabel>
              </StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visiblePositions.map((position) => (
              <PositionTableRow 
                key={position.owner} 
                position={position} 
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {positions.length > rowsPerPage && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          mt: 2,
          '& .MuiPagination-ul': {
            '& .MuiPaginationItem-root': {
              color: 'white',
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
              },
            },
          },
        }}>
          <Pagination 
            count={Math.ceil(positions.length / rowsPerPage)}
            page={page}
            onChange={(event, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}

export default PositionsTable;
