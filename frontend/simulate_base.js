// Load environment variables from .env.local
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Import necessary functions from Viem
const { createWalletClient, http } = require('viem');
const { createPublicClient } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { ethers } = require('ethers');

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

// Define the Base Sepolia Testnet chain
const baseSepoliaChain = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
    },
    public: {
      http: ['https://sepolia.base.org'],
    },
  },
};

// Contract address from environment variables
const parimutuelAddress = process.env.NEXT_PUBLIC_BASE_SEPOLIA_PARIMUTUEL_ADDRESS;
if (!parimutuelAddress) {
  console.error('Please set the NEXT_PUBLIC_BASE_SEPOLIA_PARIMUTUEL_ADDRESS environment variable.');
  process.exit(1);
}

// Setup account and wallet client
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error('Please set the PRIVATE_KEY environment variable.');
  process.exit(1);
}

const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({
  account,
  chain: baseSepoliaChain,
  transport: http(),
});

// Create public client for reading contract state
const publicClient = createPublicClient({
  chain: baseSepoliaChain,
  transport: http(),
});

// Get USD token address from environment variables
const usdAddress = process.env.NEXT_PUBLIC_BASE_SEPOLIA_USD_ADDRESS;
if (!usdAddress) {
  console.error('Please set the NEXT_PUBLIC_BASE_SEPOLIA_USD_ADDRESS environment variable.');
  process.exit(1);
}

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

// Function to wait for transaction confirmation and check status
async function waitForTransaction(hash, description) {
  try {
    console.log(`${colors.purple}Waiting for ${description} transaction to be mined...${colors.reset}`);
    const provider = ethers.getDefaultProvider('https://sepolia.base.org');
    let receipt = await provider.getTransactionReceipt(hash);
    
    // Keep polling until we get the receipt
    let attempts = 0;
    while (!receipt && attempts < 30) { // Try for about 2.5 minutes
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      receipt = await provider.getTransactionReceipt(hash);
      attempts++;
    }
    
    if (!receipt) {
      throw new Error(`Timeout waiting for ${description} transaction`);
    }
    
    if (receipt.status === 0) {
      // Get transaction to check if it ran out of gas
      const tx = await provider.getTransaction(hash);
      if (receipt.gasUsed >= tx.gasLimit) {
        throw new Error(`${description} transaction failed - Out of gas. Used: ${receipt.gasUsed}, Limit: ${tx.gasLimit}`);
      } else {
        throw new Error(`${description} transaction failed. Hash: ${hash}`);
      }
    }
    
    console.log(`${colors.green}${description} transaction successful!${colors.reset}`);
    return receipt;
  } catch (error) {
    console.error(`${colors.red}Error waiting for ${description} transaction:${colors.reset}`, error);
    throw error;
  }
}

// Add this helper function after the waitForTransaction function
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

    // Process LIQUIDATIONS in batches of 10
    const batchSize = 5;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      console.log(`${colors.purple}Processing batch ${Math.floor(i/batchSize) + 1} with ${batch.length} positions${colors.reset}`);
      
      const hash = await walletClient.writeContract({
        address: parimutuelAddress,
        abi: ParimutuelABI,
        functionName: isShort ? 'closeShortList' : 'closeLongList',
        args: [batch],
        gas: 30000000n,
      });
      
      await waitForTransaction(hash, `${isShort ? 'short' : 'long'} liquidation batch ${Math.floor(i/batchSize) + 1}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error in batch liquidation for ${isShort ? 'shorts' : 'longs'}:${colors.reset}`, error);
  }
}

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

    // Process in batches of 100 FUNDING
    const batchSize = 400;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      console.log(`${colors.purple}Processing funding batch ${Math.floor(i/batchSize) + 1} with ${batch.length} positions${colors.reset}`);
      
      const hash = await walletClient.writeContract({
        address: parimutuelAddress,
        abi: ParimutuelABI,
        functionName: isShort ? 'fundingShortList' : 'fundingLongList',
        args: [batch],
        gas: 30000000n,
      });
      
      await waitForTransaction(hash, `${isShort ? 'short' : 'long'} funding batch ${Math.floor(i/batchSize) + 1}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error in batch funding for ${isShort ? 'shorts' : 'longs'}:${colors.reset}`, error);
  }
}

// Update the runFundingChecks function
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

// Update the runMarketChecks function to use the new helpers
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
    
    // Base gas price
    const baseGasPrice = 2000000000n; // 2 gwei
    
    // First mint enough USD tokens for all positions
    const mintHash = await walletClient.writeContract({
      address: usdAddress,
      abi: USDABI,
      functionName: 'mint',
      args: [account.address, FAUCET_AMOUNT * BigInt(positions.length)],
      maxFeePerGas: baseGasPrice,
      gas: 200000n,
    });
    console.log(`${colors.magenta}[${new Date().toISOString()}] mint() transaction hash:${colors.reset} ${mintHash}`);
    await waitForTransaction(mintHash, 'mint');

    // Create margins array filled with FAUCET_AMOUNT
    const margins = Array(positions.length).fill(FAUCET_AMOUNT);

    // Open all short positions in one transaction
    const hash = await walletClient.writeContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: 'simulateShorts',
      args: [positions, margins, leverages],
      gas: 30000000n,
      maxFeePerGas: baseGasPrice * 3n,
    });
    console.log(`${colors.magenta}[${new Date().toISOString()}] simulateShorts() transaction hash:${colors.reset} ${hash}`);
    await waitForTransaction(hash, 'simulateShorts');

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
    
    // Base gas price
    const baseGasPrice = 2000000000n; // 2 gwei
    
    // First mint enough USD tokens for all positions
    const mintHash = await walletClient.writeContract({
      address: usdAddress,
      abi: USDABI,
      functionName: 'mint',
      args: [account.address, FAUCET_AMOUNT * BigInt(positions.length)],
      maxFeePerGas: baseGasPrice,
      gas: 200000n,
    });
    console.log(`${colors.magenta}[${new Date().toISOString()}] mint() transaction hash:${colors.reset} ${mintHash}`);
    await waitForTransaction(mintHash, 'mint');

    // Create margins array filled with FAUCET_AMOUNT
    const margins = Array(positions.length).fill(FAUCET_AMOUNT);

    // Open all long positions in one transaction
    const hash = await walletClient.writeContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: 'simulateLongs',
      args: [positions, margins, leverages],
      gas: 30000000n,
      maxFeePerGas: baseGasPrice * 3n,
    });
    console.log(`${colors.magenta}[${new Date().toISOString()}] simulateLongs() transaction hash:${colors.reset} ${hash}`);
    await waitForTransaction(hash, 'simulateLongs');

  } catch (error) {
    console.error(`${colors.red}[${new Date().toISOString()}] Error in simulateLongs():${colors.reset}`, error);
    if (error.cause?.cause?.shortMessage) {
      console.error(`${colors.red}Contract error message:${colors.reset}`, error.cause.cause.shortMessage);
    }
    throw error;
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

// Add this helper function to calculate market distribution
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

// Update the runSimulationCycle function
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

// Update the main function with new options
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
          await new Promise(resolve => setTimeout(resolve, 30000));
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
          await new Promise(resolve => setTimeout(resolve, 30000));
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