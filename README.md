# Parimutuel Betting Platform

A decentralized parimutuel perpetual futures platform built with Next.js, Tailwind CSS, and Foundry for smart contracts. The platform supports multiple blockchain networks including Base Sepolia and Monad Testnet.

## Project Structure

- `frontend/`: Next.js application with Tailwind CSS and ThirdWeb integration
- `foundry/`: Smart contracts built with Foundry

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (for smart contract development)
- [Git](https://git-scm.com/)

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/hollowgrahm/parimutuel.git
cd parimutuel
git submodule update --init --recursive
```

### Smart Contract Setup (Foundry)

1. Navigate to the foundry directory:

```bash
cd foundry
```

2. Install dependencies:

```bash
forge install
```

3. Create a `.env` file based on the example:

```bash
cp .env.example .env
```

4. Update the `.env` file with your private key and RPC URLs.

5. Build the contracts:

```bash
forge build
```

6. Run tests:

```bash
forge test
```

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
yarn install
# or
npm install
```

3. Create a `.env.local` file based on the example:

```bash
cp .env.local.example .env.local
```

4. Update the `.env.local` file with your ThirdWeb Client ID and contract addresses.

5. Start the development server:

```bash
yarn dev
# or
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Deployment

### Smart Contract Deployment

Follow the instructions in [foundry/DEPLOYMENT.md](foundry/DEPLOYMENT.md) to deploy the smart contracts to different blockchain networks.

### Frontend Deployment

1. Build the frontend:

```bash
cd frontend
yarn build
# or
npm run build
```

2. Start the production server:

```bash
yarn start
# or
npm start
```

## Multi-Chain Support

The application supports multiple blockchain networks. See [frontend/MULTI_CHAIN_SETUP.md](frontend/MULTI_CHAIN_SETUP.md) for details on how to configure and use the multi-chain functionality.

## Environment Variables

### Foundry Environment Variables

Create a `.env` file in the `foundry` directory with the following variables:

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

### Frontend Environment Variables

Create a `.env.local` file in the `frontend` directory with the following variables:

```
# ThirdWeb Client ID
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id

# Base Sepolia Contract Addresses
NEXT_PUBLIC_BASE_SEPOLIA_USD_ADDRESS=0x...
NEXT_PUBLIC_BASE_SEPOLIA_PARIMUTUEL_ADDRESS=0x...

# Monad Testnet Contract Addresses
NEXT_PUBLIC_MONAD_TESTNET_USD_ADDRESS=0x...
NEXT_PUBLIC_MONAD_TESTNET_PARIMUTUEL_ADDRESS=0x...
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
