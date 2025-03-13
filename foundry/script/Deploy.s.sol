// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Parimutuel} from "../src/Parimutuel.sol";
import {USDToken} from "../src/USDToken.sol";

contract Deploy is Script {
    // Network selection - can be overridden via command line args
    string public network = "base_sepolia"; // Default network

    // Oracle addresses for different networks
    address public constant BASE_SEPOLIA_ORACLE =
        0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298;
    address public constant MONAD_TESTNET_ORACLE =
        0xBf3bA2b090188B40eF83145Be0e9F30C6ca63689;

    function run() external returns (Parimutuel) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Get network from environment or use default
        string memory selectedNetwork = vm.envOr("NETWORK", network);

        // Debug output for network selection
        console.log(
            "Network from environment variable:"
            //vm.envOr("NETWORK", "not set")
        );
        console.log("Network from contract property:", network);
        console.log("Selected network for deployment:", selectedNetwork);

        // Set RPC URL and oracle address based on selected network
        string memory rpcUrl;
        address oracle;
        string memory chainName;
        bool shouldVerify;

        if (
            keccak256(abi.encodePacked(selectedNetwork)) ==
            keccak256(abi.encodePacked("base_sepolia"))
        ) {
            console.log("Selected Base Sepolia network");
            rpcUrl = vm.envString("BASE_SEPOLIA_RPC_URL");
            oracle = BASE_SEPOLIA_ORACLE;
            chainName = "base-sepolia";
            shouldVerify = true; // Base Sepolia has good verification support
        } else if (
            keccak256(abi.encodePacked(selectedNetwork)) ==
            keccak256(abi.encodePacked("monad_testnet"))
        ) {
            console.log("Selected Monad Testnet network");
            rpcUrl = vm.envString("MONAD_TESTNET_RPC_URL");
            oracle = MONAD_TESTNET_ORACLE;
            chainName = "monad-testnet";
            shouldVerify = false; // Skip verification for Monad testnet for now
        } else {
            console.log("Unknown network:", selectedNetwork);
            revert(
                string(
                    abi.encodePacked("Unsupported network: ", selectedNetwork)
                )
            );
        }

        console.log("Deploying to network:", selectedNetwork);
        console.log("Using RPC URL:", rpcUrl);
        console.log("Using oracle address:", oracle);

        vm.createSelectFork(rpcUrl);
        vm.startBroadcast(deployerPrivateKey);

        USDToken usd = new USDToken();
        Parimutuel parimutuel = new Parimutuel(address(usd), oracle);

        console.log("----------------------------------------");
        console.log("USD Token deployed to:", address(usd));
        console.log("Parimutuel deployed to:", address(parimutuel));
        console.log("----------------------------------------");

        usd.approve(
            address(parimutuel),
            115792089237316195423570985008687907853269984665640564039457584007913129639935
        );
        console.log("Approved Parimutuel to spend USD tokens");

        parimutuel.shortAddLiquidity(address(0), 5000000000000000);
        parimutuel.longAddLiquidity(address(0), 5000000000000000);
        console.log("Opened initial short and long liquidity");

        vm.stopBroadcast();

        // Only verify contracts on actual networks (not local) and if verification is enabled
        if (block.chainid != 31337 && shouldVerify) {
            verify(address(usd), "USDToken", chainName);
            verify(address(parimutuel), "Parimutuel", chainName);
        }

        return parimutuel;
    }

    function verify(
        address contractAddress,
        string memory contractName,
        string memory chainName
    ) internal {
        console.log("Verifying", contractName, "on", chainName);

        // Create the arguments array
        string[] memory args = new string[](9);
        args[0] = "forge";
        args[1] = "verify-contract";
        args[2] = vm.toString(contractAddress);
        args[3] = contractName;
        args[4] = "--chain";
        args[5] = chainName;
        args[6] = "--watch";
        args[7] = "--etherscan-api-key";
        args[8] = vm.envString("ETHERSCAN_API_KEY");

        // Call the external command and handle potential failures
        bool success = false;
        try vm.ffi(args) {
            success = true;
        } catch {
            success = false;
        }

        if (success) {
            console.log("Verification successful for", contractName);
        } else {
            console.log(
                "Verification failed for",
                contractName,
                "but deployment was successful"
            );
        }
    }
}
