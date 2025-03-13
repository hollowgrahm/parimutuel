#!/bin/bash

# Script to deploy contracts to Monad testnet

echo "Deploying contracts to Monad testnet..."

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  # Use a safer way to load environment variables
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    if [[ ! "$line" =~ ^# && -n "$line" ]]; then
      # Export the variable
      export "$line"
    fi
  done < .env
fi

# Debug: Print environment variables (comment out in production)
if [ -n "$PRIVATE_KEY" ]; then
  echo "PRIVATE_KEY is ${PRIVATE_KEY:0:6}...${PRIVATE_KEY: -4}"
else
  echo "PRIVATE_KEY is not set"
fi

if [ -n "$MONAD_TESTNET_RPC_URL" ]; then
  echo "MONAD_TESTNET_RPC_URL is $MONAD_TESTNET_RPC_URL"
else
  echo "MONAD_TESTNET_RPC_URL is not set"
fi

# Check if required environment variables are set
if [ -z "$PRIVATE_KEY" ]; then
  echo "Error: PRIVATE_KEY environment variable is not set"
  exit 1
fi

if [ -z "$MONAD_TESTNET_RPC_URL" ]; then
  echo "Error: MONAD_TESTNET_RPC_URL environment variable is not set"
  exit 1
fi

# Make update_env.sh executable
chmod +x script/update_env.sh

# Create a temporary file to store the output
OUTPUT_FILE=$(mktemp)

echo "Running deployment with private key: ${PRIVATE_KEY:0:6}...${PRIVATE_KEY: -4}"
echo "Using RPC URL: $MONAD_TESTNET_RPC_URL"

# Run the dedicated Monad deployment script
forge script script/DeployMonad.s.sol:DeployMonad \
  --rpc-url "$MONAD_TESTNET_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  -vvv | tee "$OUTPUT_FILE"

# Extract contract addresses from the output
USD_ADDRESS=$(grep "USD Token deployed to:" "$OUTPUT_FILE" | awk '{print $NF}')
PARIMUTUEL_ADDRESS=$(grep "Parimutuel deployed to:" "$OUTPUT_FILE" | awk '{print $NF}')

echo ""
echo "==================================================="
echo "Deployment to Monad testnet completed!"
echo "==================================================="
echo "USD Token: $USD_ADDRESS"
echo "Parimutuel: $PARIMUTUEL_ADDRESS"
echo "==================================================="

# Update .env file with the deployed contract addresses
if [ -n "$USD_ADDRESS" ] && [ -n "$PARIMUTUEL_ADDRESS" ]; then
  ./script/update_env.sh monad_testnet "$USD_ADDRESS" "$PARIMUTUEL_ADDRESS"
  echo "Updated .env file with the deployed contract addresses"
else
  echo "Warning: Could not extract contract addresses from the output"
  echo "Please manually update your .env file with the deployed contract addresses"
fi

# Clean up
rm "$OUTPUT_FILE" 