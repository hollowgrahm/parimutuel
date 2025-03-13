#!/bin/bash

# Script to update .env file with deployed contract addresses

if [ $# -ne 3 ]; then
  echo "Usage: $0 <network> <usd_address> <parimutuel_address>"
  echo "Example: $0 monad_testnet 0x1234... 0x5678..."
  exit 1
fi

NETWORK=$1
USD_ADDRESS=$2
PARIMUTUEL_ADDRESS=$3

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  exit 1
fi

# Update the .env file based on the network
if [ "$NETWORK" = "monad_testnet" ]; then
  # Create a temporary file
  TMP_FILE=$(mktemp)
  
  # Update the Monad testnet addresses in the .env file
  cat .env | sed "s|^NEXT_PUBLIC_MONAD_TESTNET_USD_ADDRESS=.*|NEXT_PUBLIC_MONAD_TESTNET_USD_ADDRESS=$USD_ADDRESS|g" | \
             sed "s|^NEXT_PUBLIC_MONAD_TESTNET_PARIMUTUEL_ADDRESS=.*|NEXT_PUBLIC_MONAD_TESTNET_PARIMUTUEL_ADDRESS=$PARIMUTUEL_ADDRESS|g" > "$TMP_FILE"
  
  # Replace the original .env file
  mv "$TMP_FILE" .env
  
  echo "Updated .env file with Monad testnet contract addresses"
elif [ "$NETWORK" = "base_sepolia" ]; then
  # Create a temporary file
  TMP_FILE=$(mktemp)
  
  # Update the Base Sepolia addresses in the .env file
  cat .env | sed "s|^NEXT_PUBLIC_BASE_SEPOLIA_USD_ADDRESS=.*|NEXT_PUBLIC_BASE_SEPOLIA_USD_ADDRESS=$USD_ADDRESS|g" | \
             sed "s|^NEXT_PUBLIC_BASE_SEPOLIA_PARIMUTUEL_ADDRESS=.*|NEXT_PUBLIC_BASE_SEPOLIA_PARIMUTUEL_ADDRESS=$PARIMUTUEL_ADDRESS|g" | \
             sed "s|^NEXT_PUBLIC_USD_ADDRESS=.*|NEXT_PUBLIC_USD_ADDRESS=$USD_ADDRESS|g" | \
             sed "s|^NEXT_PUBLIC_PARIMUTUEL_ADDRESS=.*|NEXT_PUBLIC_PARIMUTUEL_ADDRESS=$PARIMUTUEL_ADDRESS|g" > "$TMP_FILE"
  
  # Replace the original .env file
  mv "$TMP_FILE" .env
  
  echo "Updated .env file with Base Sepolia contract addresses"
else
  echo "Error: Unsupported network: $NETWORK"
  exit 1
fi

echo "Done!" 