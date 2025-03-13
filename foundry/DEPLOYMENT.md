# Multi-Chain Deployment Guide

This guide explains how to deploy the Parimutuel contracts to different blockchain networks.

## Supported Networks

The deployment script currently supports the following networks:

- Base Sepolia Testnet
- Monad Testnet

## Prerequisites

1. Install Foundry tools (forge, cast, anvil)
2. Set up your environment variables in a `.env` file (see `.env.example` for reference)

## Environment Setup

Create a `.env` file in the project root with the following variables:

```
# Private key for deployments
PRIVATE_KEY=your_private_key_here

# Base Sepolia RPC URL
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Monad Testnet RPC URL
MONAD_TESTNET_RPC_URL=https://testnet-rpc.monad.xyz

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Optional: Default network to use (base_sepolia or monad_testnet)
NETWORK=base_sepolia
```

## Deployment Options

### Option 1: Using Deployment Scripts

We provide convenience scripts for deploying to each network:

#### Deploy to Base Sepolia

```bash
# Make the script executable
chmod +x script/deploy_base_sepolia.sh

# Run the deployment script
./script/deploy_base_sepolia.sh
```

#### Deploy to Monad Testnet

```bash
# Make the script executable
chmod +x script/deploy_monad.sh

# Run the deployment script
./script/deploy_monad.sh
```

### Option 2: Manual Deployment

You can also deploy manually using forge:

#### Deploy to Base Sepolia

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  -vvv \
  --env NETWORK=base_sepolia
```

#### Deploy to Monad Testnet

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url $MONAD_TESTNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  -vvv \
  --env NETWORK=monad_testnet
```

## After Deployment

After deploying the contracts, you'll need to:

1. Note the deployed contract addresses from the console output
2. Update your frontend environment variables with the new contract addresses:

```
# For Base Sepolia
NEXT_PUBLIC_BASE_SEPOLIA_USD_ADDRESS=0x...
NEXT_PUBLIC_BASE_SEPOLIA_PARIMUTUEL_ADDRESS=0x...

# For Monad Testnet
NEXT_PUBLIC_MONAD_TESTNET_USD_ADDRESS=0x...
NEXT_PUBLIC_MONAD_TESTNET_PARIMUTUEL_ADDRESS=0x...
```

## Adding a New Network

To add support for a new network:

1. Update the `Deploy.s.sol` script to include the new network configuration
2. Add the appropriate RPC URL and oracle address for the new network
3. Create a deployment script for the new network
4. Update the documentation to include the new network
