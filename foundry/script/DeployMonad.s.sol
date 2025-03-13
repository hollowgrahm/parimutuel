// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Parimutuel} from "../src/Parimutuel.sol";
import {USDToken} from "../src/USDToken.sol";

contract DeployMonad is Script {
    // Oracle address for Monad testnet
    address public constant MONAD_TESTNET_ORACLE =
        0xBf3bA2b090188B40eF83145Be0e9F30C6ca63689;

    function run() external returns (Parimutuel) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory rpcUrl = vm.envString("MONAD_TESTNET_RPC_URL");

        console.log("Deploying to network: monad_testnet");
        console.log("Using RPC URL:", rpcUrl);
        console.log("Using oracle address:", MONAD_TESTNET_ORACLE);

        vm.createSelectFork(rpcUrl);
        vm.startBroadcast(deployerPrivateKey);

        USDToken usd = new USDToken();
        Parimutuel parimutuel = new Parimutuel(
            address(usd),
            MONAD_TESTNET_ORACLE
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

        return parimutuel;
    }
}
