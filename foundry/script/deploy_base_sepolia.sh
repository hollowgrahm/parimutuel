#!/bin/bash

# Script to deploy contracts to Base Sepolia testnet

echo "Deploying contracts to Base Sepolia testnet..."

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

if [ -n "$BASE_SEPOLIA_RPC_URL" ]; then
  echo "BASE_SEPOLIA_RPC_URL is $BASE_SEPOLIA_RPC_URL"
else
  echo "BASE_SEPOLIA_RPC_URL is not set"
fi

# Check if required environment variables are set
if [ -z "$PRIVATE_KEY" ]; then
  echo "Error: PRIVATE_KEY environment variable is not set"
  exit 1
fi

if [ -z "$BASE_SEPOLIA_RPC_URL" ]; then
  echo "Error: BASE_SEPOLIA_RPC_URL environment variable is not set"
  exit 1
fi

# Make update_env.sh executable
chmod +x script/update_env.sh

# Create a temporary file to store the output
OUTPUT_FILE=$(mktemp)

echo "Running deployment with private key: ${PRIVATE_KEY:0:6}...${PRIVATE_KEY: -4}"
echo "Using RPC URL: $BASE_SEPOLIA_RPC_URL"

# Run the dedicated Base Sepolia deployment script
# Using automatic gas price estimation
forge script script/DeployBaseSepolia.s.sol:DeployBaseSepolia \
  --rpc-url "$BASE_SEPOLIA_RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  -vvv | tee "$OUTPUT_FILE"

# Extract contract addresses from the output
USD_ADDRESS=$(grep "USD Token deployed to:" "$OUTPUT_FILE" | awk '{print $NF}')
PARIMUTUEL_ADDRESS=$(grep "Parimutuel deployed to:" "$OUTPUT_FILE" | awk '{print $NF}')

echo ""
echo "==================================================="
echo "Deployment to Base Sepolia testnet completed!"
echo "==================================================="
echo "USD Token: $USD_ADDRESS"
echo "Parimutuel: $PARIMUTUEL_ADDRESS"
echo "==================================================="

# Update .env file with the deployed contract addresses
if [ -n "$USD_ADDRESS" ] && [ -n "$PARIMUTUEL_ADDRESS" ]; then
  ./script/update_env.sh base_sepolia "$USD_ADDRESS" "$PARIMUTUEL_ADDRESS"
  echo "Updated .env file with the deployed contract addresses"
else
  echo "Warning: Could not extract contract addresses from the output"
  echo "Please manually update your .env file with the deployed contract addresses"
fi

# Clean up
rm "$OUTPUT_FILE" 