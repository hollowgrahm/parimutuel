// Load environment variables from .env.local
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Import necessary functions from Viem
const { createWalletClient, http, parseEther } = require('viem');
const { createPublicClient } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

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

// Define the Base Sepolia Testnet chain with Alchemy RPC
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

// Get USD token address from environment variables
const usdAddress = process.env.NEXT_PUBLIC_BASE_SEPOLIA_USD_ADDRESS;
if (!usdAddress) {
  console.error('Please set the NEXT_PUBLIC_BASE_SEPOLIA_USD_ADDRESS environment variable.');
  process.exit(1);
}

// Function to get current gas price with a safety multiplier
async function getGasPrice() {
  try {
    // Get the current gas price
    const gasPrice = await publicClient.getGasPrice();
    
    // Add a 100% safety margin to ensure our transactions get mined quickly
    const safePrice = (gasPrice * 200n) / 100n;
    
    console.log(`${colors.cyan}Current gas price: ${gasPrice} wei${colors.reset}`);
    console.log(`${colors.cyan}Using safe gas price: ${safePrice} wei${colors.reset}`);
    
    return safePrice;
  } catch (error) {
    console.error(`${colors.red}Error getting gas price:${colors.reset}`, error);
    // Fallback to a higher base price if we can't get the current one
    return parseEther('0.000000005'); // 5 gwei as fallback
  }
}

// Function to get the next nonce and wait for pending transactions
async function getNextNonce() {
  try {
    const nonce = await publicClient.getTransactionCount({
      address: account.address,
    });
    
    // Check if there are any pending transactions
    const pendingTxs = await checkPendingTransactions();
    if (pendingTxs.length > 0) {
      console.log(`${colors.yellow}Found ${pendingTxs.length} pending transactions. Waiting for them to be mined...${colors.reset}`);
      // Wait for pending transactions to be mined
      for (const tx of pendingTxs) {
        try {
          await waitForTransaction(tx.hash, 'pending');
        } catch (error) {
          console.error(`${colors.red}Error waiting for pending transaction:${colors.reset}`, error);
        }
      }
      // Get the updated nonce after pending transactions are mined
      return await publicClient.getTransactionCount({
        address: account.address,
      });
    }
    
    return nonce;
  } catch (error) {
    console.error(`${colors.red}Error getting nonce:${colors.reset}`, error);
    throw error;
  }
}

// Function to check for pending transactions by checking nonce
async function checkPendingTransactions() {
  try {
    const currentNonce = await publicClient.getTransactionCount({
      address: account.address,
    });
    const latestBlock = await publicClient.getBlockNumber();
    const latestBlockTx = await publicClient.getBlock({ blockNumber: latestBlock });
    
    // Check if any of our transactions are in the latest block
    const ourPendingTxs = latestBlockTx.transactions.filter(tx => 
      tx && tx.from && tx.from.toLowerCase() === account.address.toLowerCase() &&
      tx.nonce >= currentNonce
    );
    
    return ourPendingTxs;
  } catch (error) {
    console.error(`${colors.red}Error checking pending transactions:${colors.reset}`, error);
    return [];
  }
}

// Function to cancel a stuck transaction
async function cancelStuckTransaction(nonce) {
  try {
    console.log(`${colors.yellow}Attempting to cancel stuck transaction with nonce ${nonce}...${colors.reset}`);
    const gasPrice = await getGasPrice();
    // Use 2x the current gas price for the cancellation transaction
    const cancelGasPrice = gasPrice * 2n;
    
    // Send a zero-value transaction to ourselves with the same nonce
    const hash = await walletClient.sendTransaction({
      to: account.address,
      value: 0n,
      gas: 21000n,
      gasPrice: cancelGasPrice,
      nonce: nonce,
    });
    
    console.log(`${colors.cyan}Cancellation transaction sent: ${hash}${colors.reset}`);
    await waitForTransaction(hash, 'cancellation');
    return true;
  } catch (error) {
    console.error(`${colors.red}Error cancelling stuck transaction:${colors.reset}`, error);
    return false;
  }
}

// Function to wait for transaction confirmation and check status
async function waitForTransaction(hash, description) {
  try {
    console.log(`${colors.purple}Waiting for ${description} transaction to be mined...${colors.reset}`);
    console.log(`${colors.cyan}Transaction hash: ${hash}${colors.reset}`);
    
    // Keep polling until we get the receipt
    let attempts = 0;
    let receipt = null;
    
    while (!receipt && attempts < 60) { // Try for about 10 minutes
      try {
        receipt = await publicClient.getTransactionReceipt({ hash });
        if (!receipt) {
          console.log(`${colors.yellow}Attempt ${attempts + 1}/60: Transaction not yet mined...${colors.reset}`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
          attempts++;
        }
      } catch (error) {
        if (error.message.includes('Transaction not found')) {
          console.log(`${colors.yellow}Attempt ${attempts + 1}/60: Transaction not found in mempool, retrying...${colors.reset}`);
          await new Promise(resolve => setTimeout(resolve, 10000));
      attempts++;
        } else {
          throw error;
        }
      }
    }
    
    if (!receipt) {
      throw new Error(`Timeout waiting for ${description} transaction`);
    }
    
    if (receipt.status === 0) {
        throw new Error(`${description} transaction failed. Hash: ${hash}`);
    }
    
    console.log(`${colors.green}${description} transaction successful!${colors.reset}`);
    console.log(`${colors.cyan}Gas used: ${receipt.gasUsed}${colors.reset}`);
    console.log(`${colors.cyan}Block number: ${receipt.blockNumber}${colors.reset}`);
    return receipt;
  } catch (error) {
    console.error(`${colors.red}Error waiting for ${description} transaction:${colors.reset}`, error);
    throw error;
  }
}

// Function to process funding in batches
async function processFundingInBatches(isShort = true) {
  try {
    // Get the list of positions to process funding
    const positions = await publicClient.readContract({
      address: parimutuelAddress,
      abi: ParimutuelABI,
      functionName: isShort ? 'shortFundings' : 'longFundings'
    });

    if (positions.length === 0) {
      return;
    }

    // Process in batches of 400
    const batchSize = 200;
    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      
      // Get current gas price and nonce
      const gasPrice = await getGasPrice();
      const nonce = await getNextNonce();
      
      // Submit the transaction with current batch
      const hash = await walletClient.writeContract({
        address: parimutuelAddress,
        abi: ParimutuelABI,
        functionName: isShort ? 'fundingShortList' : 'fundingLongList',
        args: [batch],
        gas: 30000000n,
        gasPrice: gasPrice,
        nonce: nonce,
      });
      
      // Only log the Etherscan link
      process.stdout.write(`https://sepolia.basescan.org/tx/${hash}\n`);
      
      // Wait 1 second before processing next batch
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
  } catch (error) {
    // Silently handle errors
    return;
  }
}

// Function to run funding checks
async function runFundingChecks() {
  try {
    // First process all shorts
    console.log(`${colors.cyan}Processing shorts...${colors.reset}`);
    await processFundingInBatches(true);
    
    // Then process all longs
    console.log(`${colors.cyan}Processing longs...${colors.reset}`);
    await processFundingInBatches(false);
  } catch (error) {
    // Silently handle errors
    return;
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
    console.log(`${colors.bright}1: Run funding checks once${colors.reset}`);
    console.log(`${colors.bright}2: Run funding checks in loop${colors.reset}`);
    
    const mode = await askQuestion(`${colors.cyan}Choose mode (1-2):${colors.reset} `);
    
    switch (mode) {
      case '1':
        console.log(`${colors.purple}Running funding checks once...${colors.reset}`);
        await runFundingChecks();
        break;
        
      case '2':
        console.log(`${colors.purple}Running in loop mode. Press Ctrl+C to stop.${colors.reset}`);
        while (true) {
          try {
            await runFundingChecks();
          } catch (error) {
            console.error(`${colors.red}Error in main loop:${colors.reset}`, error.message);
          }
          console.log(`\n${colors.purple}Waiting 5 seconds before next check...${colors.reset}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        break;
        
      default:
        console.log(`${colors.red}Invalid option. Please choose 1-2.${colors.reset}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the script
main(); 