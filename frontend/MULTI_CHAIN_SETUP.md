# Multi-Chain Support Setup

This document explains how to set up and use the multi-chain support in the Parimutuel application.

## Overview

The application now supports multiple blockchain networks:

- Base Sepolia Testnet
- Monad Testnet

Users can switch between these networks using the network selector in the navigation bar.

## Configuration

### Environment Variables

To support multiple networks, you need to configure the contract addresses for each network in your `.env.local` file:

```
# ThirdWeb Client ID
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id

# Base Sepolia Contract Addresses
NEXT_PUBLIC_BASE_SEPOLIA_USD_ADDRESS=0x...
NEXT_PUBLIC_BASE_SEPOLIA_PARIMUTUEL_ADDRESS=0x...

# Monad Testnet Contract Addresses
NEXT_PUBLIC_MONAD_TESTNET_USD_ADDRESS=0x...
NEXT_PUBLIC_MONAD_TESTNET_PARIMUTUEL_ADDRESS=0x...

# Legacy contract addresses (for backward compatibility)
NEXT_PUBLIC_USD_ADDRESS=0x...
NEXT_PUBLIC_PARIMUTUEL_ADDRESS=0x...
```

Replace the `0x...` placeholders with your actual contract addresses for each network.

## How It Works

1. The application uses a context provider (`ThirdwebProviderWrapper`) to manage the active chain and provide it to all components.

2. The `useContractAddresses` hook retrieves the correct contract addresses for the currently selected chain.

3. Components use this hook to get the appropriate contract addresses when interacting with the blockchain.

## Adding More Networks

To add support for additional networks:

1. Add the new chain configuration to the `supportedChains` array in `ThirdwebProviderWrapper.tsx`.

2. Add the contract addresses for the new network to the `contracts` object in `config/contracts.ts`.

3. Update the `.env.local` file with the new environment variables.

## Deploying Contracts

When deploying your contracts to a new network:

1. Deploy your contracts to the target network.

2. Update the `.env.local` file with the new contract addresses.

3. Restart the application to use the new configuration.

## Testing

To test the multi-chain functionality:

1. Make sure you have test tokens on both networks.

2. Connect your wallet to the application.

3. Use the network selector in the navigation bar to switch between networks.

4. Verify that the application correctly displays data from the selected network.

5. Test transactions on each network to ensure everything works correctly.
