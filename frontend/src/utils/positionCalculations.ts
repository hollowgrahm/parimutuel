import { Address } from "viem";

const PRECISION = BigInt(1e8);
const MIN_LEVERAGE = BigInt(2e8); // 2x

interface GlobalState {
  shortProfits: bigint;
  shortShares: bigint;
  longProfits: bigint;
  longShares: bigint;
  currentPrice: bigint;
}

interface Position {
  owner: Address;
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

export function calculateShortShareValue(
  position: Position,
  price: bigint,
  globalState: GlobalState
): bigint {
  
  if (price <= position.profit) {
    // Full share of profits
    return (position.shares * globalState.shortProfits) / globalState.shortShares;
  } else if (price >= position.entry) {
    // No share of profits
    return BigInt(0);
  } else {
    // Partial share of profits based on price ratio
    const rNumerator = (price - position.profit) * BigInt(PRECISION);
    const rDenominator = position.entry - position.profit;
    const ratio = rNumerator / rDenominator;
    
    const sNumerator = position.shares * globalState.shortProfits * ratio;
    const sDenominator = globalState.shortShares * BigInt(PRECISION);
    
    return sNumerator / sDenominator;
  }
}

export function calculateLongShareValue(
  position: Position,
  price: bigint,
  globalState: GlobalState
): bigint {

  if (price >= position.profit) {
    // Full share of profits
    return (position.shares * globalState.longProfits) / globalState.longShares;
  } else if (price <= position.entry) {
    // No share of profits
    return BigInt(0);
  } else {
    // Partial share of profits based on price ratio
    const rNumerator = (price - position.entry) * BigInt(PRECISION);
    const rDenominator = position.profit - position.entry;
    const ratio = rNumerator / rDenominator;
    
    const sNumerator = position.shares * globalState.longProfits * ratio;
    const sDenominator = globalState.longShares * BigInt(PRECISION);
    
    return sNumerator / sDenominator;
  }
}