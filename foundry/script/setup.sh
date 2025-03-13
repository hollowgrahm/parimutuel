#!/bin/bash

# Make all scripts executable
chmod +x script/deploy_monad.sh
chmod +x script/deploy_base_sepolia.sh
chmod +x script/update_env.sh
chmod +x script/check_env.sh

echo "All deployment scripts are now executable."
echo ""
echo "To check your environment variables, run: ./script/check_env.sh"
echo "To deploy to Monad testnet, run: ./script/deploy_monad.sh"
echo "To deploy to Base Sepolia, run: ./script/deploy_base_sepolia.sh"
echo ""
echo "Make sure your .env file is properly configured with:"
echo "- PRIVATE_KEY"
echo "- MONAD_TESTNET_RPC_URL (for Monad deployment)"
echo "- BASE_SEPOLIA_RPC_URL (for Base Sepolia deployment)"
echo "- ETHERSCAN_API_KEY (for contract verification)" 