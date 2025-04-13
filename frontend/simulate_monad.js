// Load environment variables from .env
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Import necessary functions from Viem
const { createWalletClient, http } = require('viem');
const { createPublicClient } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { ethers } = require('ethers');
const { encodeFunctionData } = require('viem');

// Color constants  
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  purple: '\x1b[35;1m',
};

// Import ABIs
const ParimutuelABI = require('./src/config/ParimutuelABI.json');
const USDABI = require('./src/config/USDABI.json');
const PRECISION = 10n ** 8n; // Same as in the contract
const FAUCET_AMOUNT = 10000n * PRECISION; // 1000 * 10^8

// Define the Monad Testnet chain
const monadTestnetChain = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        'https://testnet-rpc.monad.xyz',
        'https://monad-testnet.g.alchemy.com/v2/iYrVMBRKUTH4Ia5nvnrmFNSYHeDA70Zf'
      ],
    },
    public: {
      http: [
        'https://testnet-rpc.monad.xyz',
        'https://monad-testnet.g.alchemy.com/v2/iYrVMBRKUTH4Ia5nvnrmFNSYHeDA70Zf'
      ],
    },
  },
};

// Track which RPC endpoint we're currently using
let currentRpcIndex = 0;
const rpcEndpoints = [
  'https://testnet-rpc.monad.xyz',
  'https://monad-testnet.g.alchemy.com/v2/iYrVMBRKUTH4Ia5nvnrmFNSYHeDA70Zf'
];

// Function to create a transport with the current RPC endpoint
function createCurrentTransport() {
  return http(rpcEndpoints[currentRpcIndex]);
}

// Function to switch to the next RPC endpoint
function switchRpcEndpoint() {
  currentRpcIndex = (currentRpcIndex + 1) % rpcEndpoints.length;
  console.log(`${colors.yellow}Switching to RPC endpoint: ${rpcEndpoints[currentRpcIndex]}${colors.reset}`);
  
  // Recreate clients with the new RPC endpoint
  recreateClients();
  
  return rpcEndpoints[currentRpcIndex];
}

// Function to recreate clients with the current RPC endpoint
function recreateClients() {
  const transport = createCurrentTransport();
  
  // Recreate wallet client
  walletClient = createWalletClient({
    account,
    chain: monadTestnetChain,
    transport: transport,
  });
  
  // Recreate public client
  publicClient = createPublicClient({
    chain: monadTestnetChain,
    transport: transport,
  });
  
  console.log(`${colors.green}Clients recreated with RPC endpoint: ${rpcEndpoints[currentRpcIndex]}${colors.reset}`);
}

// Contract address from environment variables
const parimutuelAddress = process.env.NEXT_PUBLIC_MONAD_TESTNET_PARIMUTUEL_ADDRESS;
if (!parimutuelAddress) {
  console.error('Please set the NEXT_PUBLIC_MONAD_TESTNET_PARIMUTUEL_ADDRESS environment variable.');
  process.exit(1);
}

// Setup account and wallet client
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error('Please set the PRIVATE_KEY environment variable.');
  process.exit(1);
} 

const account = privateKeyToAccount(privateKey);
let walletClient = createWalletClient({
  account,
  chain: monadTestnetChain,
  transport: createCurrentTransport(),
});

// Create public client for reading contract state
let publicClient = createPublicClient({
  chain: monadTestnetChain,
  transport: createCurrentTransport(),
});

// Add a nonce tracker
let currentNonce = null;

// Helper function to get the latest nonce
async function getLatestNonce() {
  try {
    // Get the current nonce from the blockchain
    const onchainNonce = await publicClient.getTransactionCount({
      address: account.address,
    });
    
    // If we have a tracked nonce, use the higher of the two
    if (currentNonce !== null) {
      return currentNonce > onchainNonce ? currentNonce : onchainNonce;
    }
    
    return onchainNonce;
  } catch (error) {
    console.error(`${colors.red}Error getting nonce:${colors.reset}`, error);
    // If we can't get the nonce, but have a tracked one, use that
    if (currentNonce !== null) {
      return currentNonce;
    }
    throw error;
  }
}

// Get USD token address from environment variables
const usdAddress = process.env.NEXT_PUBLIC_MONAD_TESTNET_USD_ADDRESS;
if (!usdAddress) {
  console.error('Please set the NEXT_PUBLIC_MONAD_TESTNET_USD_ADDRESS environment variable.');
  process.exit(1);
}

// Define standard delays
const TRANSACTION_DELAY = 1000;  // 1 second between transactions
const CYCLE_DELAY = 30000;        // 30 seconds between `cycles
const ERROR_DELAY = 10000;       // 10 seconds after errors

// Base gas price for Monad
const baseGasPrice = 100000000000n;

// Generate random Ethereum addresses
function generateRandomAddresses(count) {
  const addresses = [];
  for (let i = 0; i < count; i++) {
    const wallet = ethers.Wallet.createRandom();
    addresses.push(wallet.address);
  }
  return addresses;
}

// Generate random leverage values (will be multiplied by PRECISION in contract)
function generateRandomLeverages(count) {
  const leverages = [];
  for (let i = 0; i < count; i++) {
    // Generate leverage between 2 and 100
    const leverage = Math.floor(Math.random() * 99) + 2;
    leverages.push(BigInt(leverage) * PRECISION);
  }
  return leverages;
}

// Update the helper function to estimate gas with RPC fallback
async function estimateGas(txParams) {
  let attempts = 0;
  const maxAttempts = rpcEndpoints.length * 2; // Try each endpoint twice
  
  while (attempts < maxAttempts) {
    try {
      const gasEstimate = await publicClient.transport.request({
        method: "eth_estimateGas",
        params: [{
          from: txParams.account,
          to: txParams.to,
          data: txParams.data,
          value: "0x0"
        }]
      });
      
      // Convert hex string to BigInt and add 10% buffer
      const estimate = BigInt(gasEstimate);
      return (estimate * 110n) / 100n;
    } catch (error) {
      attempts++;
      
      // Check if it's a rate limit error
      if (error.status === 429 || 
          error.message?.includes('request limit reached') || 
          error.details?.includes('request limit reached')) {
        console.error(`${colors.red}Rate limit reached on RPC endpoint. Switching...${colors.reset}`);
        switchRpcEndpoint();
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else if (attempts >= maxAttempts) {
        console.error(`${colors.red}Error estimating gas after ${attempts} attempts:${colors.reset}`, error);
        // Return a default high gas limit if estimation fails
        return 30000000n;
      } else {
        console.error(`${colors.red}Error estimating gas (attempt ${attempts}/${maxAttempts}):${colors.reset}`, error);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  // If we've exhausted all attempts, return a default high gas limit
  console.error(`${colors.red}Failed to estimate gas after ${attempts} attempts. Using default.${colors.reset}`);
  return 30000000n;
}

// Add helper function to process funding in batches
async function processFundingInBatches(isShort = true) {
  try {
    // Get the list of positions to process funding
    const positions = await publicClient.readContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: isShort ? 'shortFundings' : 'longFundings'
    });

    if (positions.length === 0) {
      console.log(`${colors.purple}No ${isShort ? 'short' : 'long'} positions need funding${colors.reset}`);
      return;
    }

    console.log(`${colors.cyan}Found ${positions.length} ${isShort ? 'short' : 'long'} positions needing funding${colors.reset}`);

    // Get the current nonce from the blockchain
    let currentNonce;
    try {
      currentNonce = await publicClient.getTransactionCount({
        address: account.address,
      });
      console.log(`${colors.cyan}Current nonce for funding: ${currentNonce}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error getting nonce:${colors.reset}`, error);
      throw error;
    }

    // Process in batches of 400 for funding
    const batchSize = 400;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      console.log(`${colors.purple}Processing funding batch ${Math.floor(i/batchSize) + 1} with ${batch.length} positions${colors.reset}`);
      
      await retryWithBackoff(async (nonceOffset) => {
        // Get the nonce for this transaction
        const nonce = currentNonce + nonceOffset;
        console.log(`${colors.cyan}Using nonce ${nonce} for funding transaction${colors.reset}`);
      
      const hash = await walletClient.writeContract({
        address: parimutuelAddress,
        abi: ParimutuelABI,
        functionName: isShort ? 'fundingShortList' : 'fundingLongList',
        args: [batch],
          nonce: nonce,
        gas: await estimateGas({
          account: account.address,
          to: parimutuelAddress,
          data: encodeFunctionData({
            abi: ParimutuelABI,
            functionName: isShort ? 'fundingShortList' : 'fundingLongList',
            args: [batch]
          })
        }),
          maxFeePerGas: baseGasPrice * 2n,
      });
      
      console.log(`${colors.magenta}[${new Date().toISOString()}] ${isShort ? 'short' : 'long'} funding batch ${Math.floor(i/batchSize) + 1} transaction hash: ${hash}${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));
        
        // Increment the nonce for the next transaction
        currentNonce++;
        
        return hash;
      });
    }
  } catch (error) {
    console.error(`${colors.red}Error in batch funding for ${isShort ? 'shorts' : 'longs'}:${colors.reset}`, error);
  }
}

// Add helper function to liquidate in batches
async function liquidateInBatches(isShort = true) {
  try {
    // Get the list of positions to liquidate
    const positions = await publicClient.readContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: isShort ? 'shortLiquidations' : 'longLiquidations'
    });

    if (positions.length === 0) {
      console.log(`${colors.purple}No ${isShort ? 'short' : 'long'} positions to liquidate${colors.reset}`);
      return;
    }

    console.log(`${colors.cyan}Found ${positions.length} ${isShort ? 'short' : 'long'} positions to liquidate${colors.reset}`);

    // Get the current nonce from the blockchain
    let currentNonce;
    try {
      currentNonce = await publicClient.getTransactionCount({
        address: account.address,
      });
      console.log(`${colors.cyan}Current nonce for liquidation: ${currentNonce}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error getting nonce:${colors.reset}`, error);
      throw error;
    }

    // Process liquidations in batches of 5
    const batchSize = 5;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      console.log(`${colors.purple}Processing batch ${Math.floor(i/batchSize) + 1} with ${batch.length} positions${colors.reset}`);
      
      await retryWithBackoff(async (nonceOffset) => {
        // Get the nonce for this transaction
        const nonce = currentNonce + nonceOffset;
        console.log(`${colors.cyan}Using nonce ${nonce} for liquidation transaction${colors.reset}`);
      
      const hash = await walletClient.writeContract({
        address: parimutuelAddress,
        abi: ParimutuelABI,
        functionName: isShort ? 'closeShortList' : 'closeLongList',
        args: [batch],
          nonce: nonce,
        gas: await estimateGas({
          account: account.address,
          to: parimutuelAddress,
          data: encodeFunctionData({
            abi: ParimutuelABI,
            functionName: isShort ? 'closeShortList' : 'closeLongList',
            args: [batch]
          })
        }),
          maxFeePerGas: baseGasPrice * 2n,
      });
      
      console.log(`${colors.magenta}[${new Date().toISOString()}] ${isShort ? 'short' : 'long'} liquidation batch ${Math.floor(i/batchSize) + 1} transaction hash: ${hash}${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));
        
        // Increment the nonce for the next transaction
        currentNonce++;
        
        return hash;
      });
    }
  } catch (error) {
    console.error(`${colors.red}Error in batch liquidation for ${isShort ? 'shorts' : 'longs'}:${colors.reset}`, error);
  }
}

// Function to run funding checks
async function runFundingChecks() {
  try {
    // Check and run funding for shorts in batches
    console.log(`${colors.cyan}[${new Date().toISOString()}] Running shorts funding check...${colors.reset}`);
    await processFundingInBatches(true);

    // Check and run funding for longs in batches
    console.log(`${colors.cyan}[${new Date().toISOString()}] Running longs funding check...${colors.reset}`);
    await processFundingInBatches(false);

    console.log(`${colors.green}Funding checks completed${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Fatal error in funding checks:${colors.reset}`, error);
    throw error;
  }
}

// Function to run liquidation checks
async function runLiquidationChecks() {
  try {
    // Check and run liquidations for shorts in batches
    console.log(`${colors.cyan}[${new Date().toISOString()}] Running shorts liquidation check...${colors.reset}`);
    await liquidateInBatches(true);

    // Check and run liquidations for longs in batches
    console.log(`${colors.cyan}[${new Date().toISOString()}] Running longs liquidation check...${colors.reset}`);
    await liquidateInBatches(false);

    console.log(`${colors.green}Liquidation checks completed${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Fatal error in liquidation checks:${colors.reset}`, error);
    throw error;
  }
}

// Function to run all market checks
async function runMarketChecks() {
  try {
    await runFundingChecks();
    await runLiquidationChecks();
    console.log(`${colors.green}All market checks completed${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Fatal error in market checks:${colors.reset}`, error);
    throw error;
  }
}

// Add helper function to check if leverage is valid
async function isValidLeverage(margin, leverage, isShort) {
  try {
    const tokens = margin * leverage / PRECISION;
    
    // Get the appropriate market size
    const marketTokens = await publicClient.readContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: isShort ? 'shortTokens' : 'longTokens'
    });

    // Calculate leverage fee
    const leverageFee = await publicClient.readContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: 'leverageFee',
      args: [tokens, marketTokens]
    });

    // Position is valid if leverage fee is less than margin
    return leverageFee < margin;
  } catch (error) {
    console.error(`${colors.red}Error checking leverage validity:${colors.reset}`, error);
    return false;
  }
}

// Add helper function to get market distribution
async function getMarketDistribution() {
  try {
    const shortTokens = await publicClient.readContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: 'shortTokens'
    });

    const longTokens = await publicClient.readContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: 'longTokens'
    });

    const totalTokens = shortTokens + longTokens;
    if (totalTokens === 0n) {
      return { shortPercentage: 50, longPercentage: 50 };
    }

    const shortPercentage = Number((shortTokens * 100n) / totalTokens);
    const longPercentage = 100 - shortPercentage;

    return { shortPercentage, longPercentage };
  } catch (error) {
    console.error(`${colors.red}Error getting market distribution:${colors.reset}`, error);
    return { shortPercentage: 50, longPercentage: 50 }; // Default to 50-50 if error
  }
}

// Update the isRpcError function to include rate limit errors
function isRpcError(error) {
  return error.message?.includes('Unexpected end of JSON input') || 
         error.message?.includes('HTTP request failed') ||
         error.message?.includes('Another transaction has higher priority') ||
         error.details?.includes('Another transaction has higher priority') ||
         error.shortMessage?.includes('Another transaction has higher priority') ||
         error.cause?.shortMessage?.includes('Another transaction has higher priority') ||
         error.message?.includes('nonce too low') ||
         error.message?.includes('Transaction nonce too low') ||
         error.shortMessage?.includes('nonce too low') ||
         error.cause?.shortMessage?.includes('nonce too low') ||
         error.status === 429 ||
         error.message?.includes('request limit reached') ||
         error.details?.includes('request limit reached');
}

// Update the retryWithBackoff function to handle RPC rate limit errors
async function retryWithBackoff(fn, maxRetries = 5, initialDelay = 2000) {
  let retries = 0;
  let delay = initialDelay;
  let nonceOffset = 0;
  
  while (retries < maxRetries) {
    try {
      // If we've had nonce issues, try with an incremented nonce
      if (nonceOffset > 0) {
        console.log(`${colors.cyan}Trying with nonce offset: +${nonceOffset}${colors.reset}`);
      }
      
      return await fn(nonceOffset);
    } catch (error) {
      if (isRpcError(error)) {
        retries++;
        
        // Check if it's a rate limit error
        if (error.status === 429 || 
            error.message?.includes('request limit reached') || 
            error.details?.includes('request limit reached')) {
          console.log(`${colors.yellow}Rate limit error detected. Switching RPC endpoint...${colors.reset}`);
          switchRpcEndpoint();
        }
        
        // For nonce errors, increment the nonce offset
        if (error.message?.includes('nonce too low') || 
            error.shortMessage?.includes('nonce too low') ||
            error.cause?.shortMessage?.includes('nonce too low')) {
          console.log(`${colors.yellow}Nonce error detected. Incrementing nonce offset...${colors.reset}`);
          nonceOffset++;
          console.log(`${colors.cyan}New nonce offset: +${nonceOffset}${colors.reset}`);
        }
        
        if (retries >= maxRetries) {
          console.error(`${colors.red}Maximum retries (${maxRetries}) reached. Giving up.${colors.reset}`);
          throw error;
        }
        
        console.log(`${colors.yellow}RPC error detected. Retrying in ${delay/1000} seconds (attempt ${retries}/${maxRetries})...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Increase gas price for next attempt and implement exponential backoff
        delay *= 2;
      } else {
        // Not an RPC error, rethrow
        throw error;
      }
    }
  }
}

// Function to simulate shorts
async function simulateShorts(positions, leverages) {
  try {
    console.log(`${colors.cyan}Attempting to simulate shorts with:${colors.reset}`);
    console.log(`${colors.bright}Caller address:${colors.reset}`, account.address);
    console.log(`${colors.bright}Number of positions:${colors.reset}`, positions.length);
    console.log(`${colors.bright}Contract address:${colors.reset}`, parimutuelAddress);
    
    // Debug logs for first position
    console.log(`${colors.purple}Debug - First position address:${colors.reset}`, positions[0]);
    console.log(`${colors.purple}Debug - First position leverage:${colors.reset}`, leverages[0]);
    console.log(`${colors.purple}Debug - FAUCET_AMOUNT:${colors.reset}`, FAUCET_AMOUNT.toString());
    
    // Get the current nonce from the blockchain
    let currentNonce;
    try {
      currentNonce = await publicClient.getTransactionCount({
        address: account.address,
      });
      console.log(`${colors.cyan}Current nonce for shorts: ${currentNonce}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error getting nonce:${colors.reset}`, error);
      throw error;
    }
    
    // First mint enough USD tokens for all positions with retry logic
    await retryWithBackoff(async (nonceOffset) => {
      // Get the latest nonce for this transaction
      const nonce = currentNonce + nonceOffset;
      console.log(`${colors.cyan}Using nonce ${nonce} for mint transaction${colors.reset}`);
      
    const mintHash = await walletClient.writeContract({
      address: usdAddress,
      abi: USDABI,
      functionName: 'mint',
      args: [account.address, FAUCET_AMOUNT * BigInt(positions.length)],
        maxFeePerGas: baseGasPrice * 2n, // Increase base gas price
        nonce: nonce, // Explicitly set the nonce
      gas: await estimateGas({
        account: account.address,
        to: usdAddress,
        data: encodeFunctionData({
          abi: USDABI,
          functionName: 'mint',
          args: [account.address, FAUCET_AMOUNT * BigInt(positions.length)]
        })
      }),
    });
    console.log(`${colors.magenta}[${new Date().toISOString()}] mint() transaction hash:${colors.reset} ${mintHash}`);
    await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));
      
      // Increment the current nonce for the next transaction
      currentNonce++;
      
      return mintHash;
    });

    // Create margins array filled with FAUCET_AMOUNT
    const margins = Array(positions.length).fill(FAUCET_AMOUNT);

    // Open all short positions in one transaction with retry logic
    await retryWithBackoff(async (nonceOffset) => {
      // Get the latest nonce for this transaction
      const nonce = currentNonce + nonceOffset;
      console.log(`${colors.cyan}Using nonce ${nonce} for simulateShorts transaction${colors.reset}`);
      
    const hash = await walletClient.writeContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: 'simulateShorts',
      args: [positions, margins, leverages],
        nonce: nonce, // Explicitly set the nonce
      gas: await estimateGas({
        account: account.address,
        to: parimutuelAddress,
        data: encodeFunctionData({
          abi: ParimutuelABI,
          functionName: 'simulateShorts',
          args: [positions, margins, leverages]
        })
      }),
        maxFeePerGas: baseGasPrice * 4n, // Increase gas price for this transaction
    });
    console.log(`${colors.magenta}[${new Date().toISOString()}] simulateShorts() transaction hash:${colors.reset} ${hash}`);
    await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));
      return hash;
    });

  } catch (error) {
    console.error(`${colors.red}[${new Date().toISOString()}] Error in simulateShorts():${colors.reset}`, error);
    if (error.cause?.cause?.shortMessage) {
      console.error(`${colors.red}Contract error message:${colors.reset}`, error.cause.cause.shortMessage);
    }
    throw error;
  }
}

// Function to simulate longs
async function simulateLongs(positions, leverages) {
  try {
    console.log(`${colors.cyan}Attempting to simulate longs with:${colors.reset}`);
    console.log(`${colors.bright}Caller address:${colors.reset}`, account.address);
    console.log(`${colors.bright}Number of positions:${colors.reset}`, positions.length);
    console.log(`${colors.bright}Contract address:${colors.reset}`, parimutuelAddress);
    
    // Get the current nonce from the blockchain
    let currentNonce;
    try {
      currentNonce = await publicClient.getTransactionCount({
        address: account.address,
      });
      console.log(`${colors.cyan}Current nonce for longs: ${currentNonce}${colors.reset}`);
    } catch (error) {
      console.error(`${colors.red}Error getting nonce:${colors.reset}`, error);
      throw error;
    }
    
    // First mint enough USD tokens for all positions with retry logic
    await retryWithBackoff(async (nonceOffset) => {
      // Get the latest nonce for this transaction
      const nonce = currentNonce + nonceOffset;
      console.log(`${colors.cyan}Using nonce ${nonce} for mint transaction${colors.reset}`);
      
    const mintHash = await walletClient.writeContract({
      address: usdAddress,
      abi: USDABI,
      functionName: 'mint',
      args: [account.address, FAUCET_AMOUNT * BigInt(positions.length)],
        maxFeePerGas: baseGasPrice * 2n, // Increase base gas price
        nonce: nonce, // Explicitly set the nonce
      gas: await estimateGas({
        account: account.address,
        to: usdAddress,
        data: encodeFunctionData({
          abi: USDABI,
          functionName: 'mint',
          args: [account.address, FAUCET_AMOUNT * BigInt(positions.length)]
        })
      }),
    });
    console.log(`${colors.magenta}[${new Date().toISOString()}] mint() transaction hash:${colors.reset} ${mintHash}`);
    await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));
      
      // Increment the current nonce for the next transaction
      currentNonce++;
      
      return mintHash;
    });

    // Create margins array filled with FAUCET_AMOUNT
    const margins = Array(positions.length).fill(FAUCET_AMOUNT);

    // Open all long positions in one transaction with retry logic
    await retryWithBackoff(async (nonceOffset) => {
      // Get the latest nonce for this transaction
      const nonce = currentNonce + nonceOffset;
      console.log(`${colors.cyan}Using nonce ${nonce} for simulateLongs transaction${colors.reset}`);
      
    const hash = await walletClient.writeContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: 'simulateLongs',
      args: [positions, margins, leverages],
        nonce: nonce, // Explicitly set the nonce
      gas: await estimateGas({
        account: account.address,
        to: parimutuelAddress,
        data: encodeFunctionData({
          abi: ParimutuelABI,
          functionName: 'simulateLongs',
          args: [positions, margins, leverages]
        })
      }),
        maxFeePerGas: baseGasPrice * 4n, // Increase gas price even more for this transaction
    });
    console.log(`${colors.magenta}[${new Date().toISOString()}] simulateLongs() transaction hash:${colors.reset} ${hash}`);
    await new Promise(resolve => setTimeout(resolve, TRANSACTION_DELAY));
      return hash;
    });

  } catch (error) {
    console.error(`${colors.red}[${new Date().toISOString()}] Error in simulateLongs():${colors.reset}`, error);
    if (error.cause?.cause?.shortMessage) {
      console.error(`${colors.red}Contract error message:${colors.reset}`, error.cause.cause.shortMessage);
    }
    throw error;
  }
}

// Function to run one simulation cycle
async function runSimulationCycle() {
  try {
    // Run market checks at the start
    console.log(`${colors.cyan}Running initial market checks...${colors.reset}`);
    await runMarketChecks();

    // Get current market distribution
    const { shortPercentage, longPercentage } = await getMarketDistribution();
    console.log(`${colors.cyan}Current market distribution: ${shortPercentage}% shorts, ${longPercentage}% longs${colors.reset}`);

    const basePositions = 1; // Base number of positions
    let numShortPositions = basePositions;
    let numLongPositions = basePositions;

    // Adjust number of positions based on market distribution
    if (shortPercentage > 60) {
      numLongPositions = basePositions * 2;
      console.log(`${colors.purple}Short side dominance detected. Doubling long positions to ${numLongPositions}${colors.reset}`);
    } else if (longPercentage > 60) {
      numShortPositions = basePositions * 2;
      console.log(`${colors.purple}Long side dominance detected. Doubling short positions to ${numShortPositions}${colors.reset}`);
    }

    // Generate addresses and leverages for shorts
    const shortPositions = generateRandomAddresses(numShortPositions);
    const shortLeverages = generateRandomLeverages(numShortPositions);
    console.log(`${colors.bright}Generated ${numShortPositions} random short positions with leverages:${colors.reset}`, shortLeverages);

    // Execute shorts simulation
    console.log(`\n${colors.cyan}Simulating short positions...${colors.reset}`);
    await simulateShorts(shortPositions, shortLeverages);

    // Run market checks before longs
    console.log(`${colors.cyan}Running market checks before long positions...${colors.reset}`);
    await runMarketChecks();

    // Generate addresses and leverages for longs
    const longPositions = generateRandomAddresses(numLongPositions);
    const longLeverages = generateRandomLeverages(numLongPositions);
    console.log(`${colors.bright}Generated ${numLongPositions} random long positions with leverages:${colors.reset}`, longLeverages);

    // Execute longs simulation
    console.log(`\n${colors.cyan}Simulating long positions...${colors.reset}`);
    await simulateLongs(longPositions, longLeverages);

    console.log(`${colors.green}Simulation cycle completed successfully${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error in simulation cycle:${colors.reset}`, error.message);
    // Don't rethrow the error - let the loop continue
  }
}

// Helper function to prompt user for input
function askQuestion(query) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => 
    rl.question(query, ans => {
      rl.close();
      resolve(ans);
    })
  );
}

// Main function with menu options
async function main() {
  try {
    console.log(`${colors.cyan}Available modes:${colors.reset}`);
    console.log(`${colors.bright}1: Run full simulation once${colors.reset}`);
    console.log(`${colors.bright}2: Run full simulation in loop${colors.reset}`);
    console.log(`${colors.bright}3: Run all market checks${colors.reset}`);
    console.log(`${colors.bright}4: Run funding checks only${colors.reset}`);
    console.log(`${colors.bright}5: Run liquidation checks only${colors.reset}`);
    console.log(`${colors.bright}6: Run market checks in loop${colors.reset}`);
    
    const mode = await askQuestion(`${colors.cyan}Choose mode (1-6):${colors.reset} `);
    
    switch (mode) {
      case '1':
        console.log(`${colors.purple}Running simulation once...${colors.reset}`);
        await runSimulationCycle();
        break;
        
      case '2':
        console.log(`${colors.purple}Running in loop mode. Press Ctrl+C to stop.${colors.reset}`);
        while (true) {
          try {
            await runSimulationCycle();
          } catch (error) {
            console.error(`${colors.red}Error in main loop:${colors.reset}`, error.message);
          }
          console.log(`\n${colors.purple}Waiting 30 seconds before next cycle...${colors.reset}`);
          await new Promise(resolve => setTimeout(resolve, CYCLE_DELAY));
        }
        break;
        
      case '3':
        console.log(`${colors.purple}Running all market checks...${colors.reset}`);
        await runMarketChecks();
        break;

      case '4':
        console.log(`${colors.purple}Running funding checks only...${colors.reset}`);
        await runFundingChecks();
        break;

      case '5':
        console.log(`${colors.purple}Running liquidation checks only...${colors.reset}`);
        await runLiquidationChecks();
        break;

      case '6':
        console.log(`${colors.purple}Running market checks in loop. Press Ctrl+C to stop.${colors.reset}`);
        while (true) {
          try {
            await runMarketChecks();
          } catch (error) {
            console.error(`${colors.red}Error in market checks loop:${colors.reset}`, error.message);
          }
          console.log(`\n${colors.purple}Waiting 30 seconds before next market check...${colors.reset}`);
          await new Promise(resolve => setTimeout(resolve, CYCLE_DELAY));
        }
        break;
        
      default:
        console.log(`${colors.red}Invalid option. Please choose 1-6.${colors.reset}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the script
main(); 