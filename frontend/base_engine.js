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
      http: ['https://base-sepolia.g.alchemy.com/v2/iYrVMBRKUTH4Ia5nvnrmFNSYHeDA70Zf'],
    },
    public: {
      http: ['https://base-sepolia.g.alchemy.com/v2/iYrVMBRKUTH4Ia5nvnrmFNSYHeDA70Zf'],
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

// Function to liquidate positions individually
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

    // Process each position individually
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      console.log(`${colors.purple}Processing position ${i + 1}/${positions.length}: ${position}${colors.reset}`);
      
      try {
        const hash = await walletClient.writeContract({
          address: parimutuelAddress,
          abi: ParimutuelABI,
          functionName: isShort ? 'shortLiquidate' : 'longLiquidate',
          args: [position],
          gas: 3000000n, // Reduced gas limit since we're only processing one position
        });
        
        await waitForTransaction(hash, `${isShort ? 'short' : 'long'} liquidation for position ${i + 1}`);
        console.log(`${colors.green}Successfully liquidated position ${i + 1}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}Error liquidating position ${i + 1}:${colors.reset}`, error);
        // Continue with next position even if one fails
        continue;
      }

      // Add a small delay between liquidations to prevent network congestion
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error(`${colors.red}Error in liquidation process for ${isShort ? 'shorts' : 'longs'}:${colors.reset}`, error);
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

// Function to process funding for positions individually
async function processFunding(isShort = true) {
  try {
    // Get the list of positions that need funding
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

    // Process each position individually
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      console.log(`${colors.purple}Processing funding for position ${i + 1}/${positions.length}: ${position}${colors.reset}`);
      
      try {
        const hash = await walletClient.writeContract({
          address: parimutuelAddress,
          abi: ParimutuelABI,
          functionName: isShort ? 'shortFundRate' : 'longFundRate',
          args: [position],
          gas: 3000000n, // Reduced gas limit since we're only processing one position
        });
        
        await waitForTransaction(hash, `${isShort ? 'short' : 'long'} funding for position ${i + 1}`);
        console.log(`${colors.green}Successfully processed funding for position ${i + 1}${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}Error processing funding for position ${i + 1}:${colors.reset}`, error);
        // Continue with next position even if one fails
        continue;
      }

      // Add a small delay between funding operations to prevent network congestion
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error(`${colors.red}Error in funding process for ${isShort ? 'shorts' : 'longs'}:${colors.reset}`, error);
  }
}

async function runFundingChecks() {
  try {
    // Check and process funding for shorts
    console.log(`${colors.cyan}[${new Date().toISOString()}] Running shorts funding check...${colors.reset}`);
    await processFunding(true);

    // Check and process funding for longs
    console.log(`${colors.cyan}[${new Date().toISOString()}] Running longs funding check...${colors.reset}`);
    await processFunding(false);

    console.log(`${colors.green}Funding checks completed${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Fatal error in funding checks:${colors.reset}`, error);
    throw error;
  }
}

async function runAllChecks() {
  try {
    // Run liquidation checks first
    await runLiquidationChecks();
    
    // Then run funding checks
    await runFundingChecks();
    
    console.log(`${colors.green}All checks completed${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Fatal error in checks:${colors.reset}`, error);
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

// Main function
async function main() {
  try {
    console.log(`${colors.cyan}Available modes:${colors.reset}`);
    console.log(`${colors.bright}1: Run all checks once${colors.reset}`);
    console.log(`${colors.bright}2: Run all checks in loop${colors.reset}`);
    console.log(`${colors.bright}3: Run funding checks only${colors.reset}`);
    console.log(`${colors.bright}4: Run liquidation checks only${colors.reset}`);
    
    const mode = await askQuestion(`${colors.cyan}Choose mode (1-4):${colors.reset} `);
    
    switch (mode) {
      case '1':
        console.log(`${colors.purple}Running all checks once...${colors.reset}`);
        await runAllChecks();
        break;
        
      case '2':
        console.log(`${colors.purple}Running in loop mode. Press Ctrl+C to stop.${colors.reset}`);
        while (true) {
          try {
            await runAllChecks();
          } catch (error) {
            console.error(`${colors.red}Error in main loop:${colors.reset}`, error.message);
          }
          console.log(`\n${colors.purple}Waiting 30 seconds before next check...${colors.reset}`);
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
        break;

      case '3':
        console.log(`${colors.purple}Running funding checks only...${colors.reset}`);
        await runFundingChecks();
        break;

      case '4':
        console.log(`${colors.purple}Running liquidation checks only...${colors.reset}`);
        await runLiquidationChecks();
        break;
        
      default:
        console.log(`${colors.red}Invalid option. Please choose 1-4.${colors.reset}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the script
main();
