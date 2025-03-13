# Technical Documentation: Parimutuel Protocol

This document provides a technical overview of the Parimutuel Protocol, explaining its architecture, design choices, and technical implementation.

## System Architecture

The Parimutuel Protocol is built using a modern web3 architecture with the following components:

1. **Smart Contracts (Backend)**: Solidity contracts deployed on EVM-compatible blockchains
2. **Web Frontend**: Next.js application with ThirdWeb integration
3. **Multi-Chain Support**: Infrastructure for operating across multiple blockchain networks

### Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Web Frontend   │◄────┤  ThirdWeb SDK   │◄────┤ Smart Contracts │
│  (Next.js)      │     │                 │     │ (Solidity)      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Core Technologies

### Smart Contracts

- **Language**: Solidity
- **Development Framework**: Foundry
- **Testing**: Forge (part of Foundry)
- **Deployment**: Forge scripts

The smart contracts implement the parimutuel perpetual futures logic, which allows users to specualte on any index. The system automatically calculates and distributes profits based on the proportion of stake placed on each outcome.

### Frontend

- **Framework**: Next.js
- **UI Library**: React
- **Styling**: Tailwind CSS
- **Web3 Integration**: ThirdWeb SDK
- **State Management**: React Context API
- **Form Handling**: React Hook Form

The frontend provides a user-friendly interface for interacting with the smart contracts, allowing users to open positions, view current pools, and claim profits.

### Multi-Chain Support

The platform supports multiple blockchain networks, including:

- Base Sepolia
- Monad Testnet

This is implemented using ThirdWeb's chain switching capabilities and environment-specific contract addresses.

## Core Functionality

### Parimutuel Protocol

The core of the platform is a parimutuel perpetual future system, which works as follows:

1. **Market Creation**: anyone can create new markets by proficing a price oracle
2. **Market Participation**: anyone can then come and open short or long positions to speculate on the price of an asset
3. **Funding Engine**: in order to balance the market distribution, the larger side with pay a funding rate every fifteen minutes to incentivize new positions to take the opposing side of the trade
4. **Liquidation Engine**: positions remain active until margin runs out due to funding payments or the oracle price crosses their liquidation threshold
5. **Distribution**: Profits are distributed proportionally among users by minting shares based on the size of positions

### Smart Contract Components

#### Parimutuel Contract

The main contract handles:

- Pool creation and management
- Opening positions
- Funding engine
- Liquidation engine
- Profit distribution

#### USD Token Contract

A simple ERC20 token used for opening positions within the system.

## Technical Design Choices

### Why Foundry?

Foundry was chosen for smart contract development because:

- Fast compilation and testing
- Solidity-based testing framework
- Powerful debugging capabilities
- Efficient deployment scripts

### Why Next.js?

Next.js was selected for the frontend because:

- Server-side rendering capabilities
- Optimized performance
- Built-in routing
- TypeScript support
- Large ecosystem and community support

### Why ThirdWeb?

ThirdWeb was chosen for web3 integration because:

- Simplified wallet connection
- Multi-chain support
- Contract interaction abstractions
- Comprehensive SDK for web3 functionality

## Data Flow

1. **User Interaction**: Users interact with the frontend to manage positions, view pools, and claim profits
2. **Frontend Processing**: The frontend processes user inputs and prepares transactions
3. **ThirdWeb Integration**: ThirdWeb handles wallet connections and transaction signing
4. **Blockchain Interaction**: Signed transactions are sent to the blockchain
5. **Smart Contract Execution**: Smart contracts execute the requested operations
6. **Event Emission**: Smart contracts emit events for important actions
7. **Frontend Updates**: The frontend listens for events and updates the UI accordingly

## External Dependencies

### Smart Contract Dependencies

- **Solmate Contracts**: Used for standard implementations of ERC20 and access control
- **Chainlink**: Used for price feeds

### Frontend Dependencies

- **ThirdWeb SDK**: For blockchain interaction
- **Material UI**: For UI components
- **Tailwind CSS**: For styling
- **React Hook Form**: For form handling
- **framer-motion**: For animations

## Security Considerations

The platform implements several security measures:

1. **Access Control**: Role-based access control for administrative functions
2. **Input Validation**: Thorough validation of user inputs both on the frontend and in smart contracts
3. **Reentrancy Protection**: Guards against reentrancy attacks
4. **Gas Optimization**: Efficient code to minimize gas costs
5. **Error Handling**: Comprehensive error handling and recovery mechanisms

## Deployment Strategy

The platform uses a multi-stage deployment process:

1. **Local Testing**: Development and testing in a local environment
2. **Testnet Deployment**: Deployment to testnets for integration testing
3. **Mainnet Deployment**: Final deployment to production networks

## Future Technical Improvements

Planned technical improvements include:

1. **Layer 2 Integration**: Support for additional Layer 2 networks
2. **Enhanced Analytics**: More comprehensive analytics and reporting
3. **Mobile Optimization**: Improved mobile experience
4. **Performance Optimizations**: Further optimizations for gas efficiency and frontend performance

## Conclusion

The Parimutuel Protocol combines modern web development technologies with blockchain capabilities to create a perpetual futures platform. The architecture is designed to be scalable, secure, and user-friendly, with support for multiple blockchain networks.
