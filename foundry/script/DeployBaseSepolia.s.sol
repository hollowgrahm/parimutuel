// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Parimutuel} from "../src/Parimutuel.sol";
import {USDToken} from "../src/USDToken.sol";

contract DeployBaseSepolia is Script {
    // Oracle address for Base Sepolia
    address public constant BASE_SEPOLIA_ORACLE =
        0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298;

    function run() external returns (Parimutuel) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory rpcUrl = vm.envString("BASE_SEPOLIA_RPC_URL");

        console.log("Deploying to network: base_sepolia");
        console.log("Using RPC URL:", rpcUrl);
        console.log("Using oracle address:", BASE_SEPOLIA_ORACLE);

        vm.createSelectFork(rpcUrl);
        vm.startBroadcast(deployerPrivateKey);

        USDToken usd = new USDToken();
        Parimutuel parimutuel = new Parimutuel(
            address(usd),
            BASE_SEPOLIA_ORACLE
        );

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

        // Verify contracts
        try this.verify(address(usd), "USDToken", "base-sepolia") {
            console.log("Verification successful for USDToken");
        } catch {
            console.log(
                "Verification failed for USDToken but deployment was successful"
            );
        }

        try this.verify(address(parimutuel), "Parimutuel", "base-sepolia") {
            console.log("Verification successful for Parimutuel");
        } catch {
            console.log(
                "Verification failed for Parimutuel but deployment was successful"
            );
        }

        return parimutuel;
    }

    function verify(
        address contractAddress,
        string memory contractName,
        string memory chainName
    ) external {
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

        vm.ffi(args);
    }
}
