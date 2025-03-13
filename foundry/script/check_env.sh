#!/bin/bash

# Script to check environment variables

echo "Checking environment variables..."

# Load environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Found .env file"
  
  # Use a safer way to load environment variables
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    if [[ ! "$line" =~ ^# && -n "$line" ]]; then
      # Export the variable
      export "$line"
      
      # Extract variable name
      VAR_NAME=$(echo "$line" | cut -d= -f1)
      echo "Loaded: $VAR_NAME"
    fi
  done < .env
else
  echo "Error: .env file not found"
  exit 1
fi

echo ""
echo "==================================================="
echo "Environment Variables Check"
echo "==================================================="

# Check PRIVATE_KEY
if [ -n "$PRIVATE_KEY" ]; then
  echo "✅ PRIVATE_KEY is set: ${PRIVATE_KEY:0:6}...${PRIVATE_KEY: -4}"
else
  echo "❌ PRIVATE_KEY is not set"
fi

# Check BASE_SEPOLIA_RPC_URL
if [ -n "$BASE_SEPOLIA_RPC_URL" ]; then
  echo "✅ BASE_SEPOLIA_RPC_URL is set: $BASE_SEPOLIA_RPC_URL"
else
  echo "❌ BASE_SEPOLIA_RPC_URL is not set"
fi

# Check MONAD_TESTNET_RPC_URL
if [ -n "$MONAD_TESTNET_RPC_URL" ]; then
  echo "✅ MONAD_TESTNET_RPC_URL is set: $MONAD_TESTNET_RPC_URL"
else
  echo "❌ MONAD_TESTNET_RPC_URL is not set"
fi

# Check ETHERSCAN_API_KEY
if [ -n "$ETHERSCAN_API_KEY" ]; then
  echo "✅ ETHERSCAN_API_KEY is set: ${ETHERSCAN_API_KEY:0:6}...${ETHERSCAN_API_KEY: -4}"
else
  echo "❌ ETHERSCAN_API_KEY is not set"
fi

echo "==================================================="
echo "Environment file content (sanitized):"
echo "==================================================="

# Display .env file content with sensitive information masked
cat .env | sed 's/\(PRIVATE_KEY=\)[^[:space:]]*/\1********/g' | \
           sed 's/\(ETHERSCAN_API_KEY=\)[^[:space:]]*/\1********/g'

echo "==================================================="
echo "Done!" 