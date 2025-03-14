// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Parimutuel} from "../src/Parimutuel.sol";
import {USDToken} from "../src/USDToken.sol";

contract Deploy is Script {
    string public constant CHAIN = "base_sepolia";

    function run() external returns (Parimutuel) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        string memory rpcUrl = vm.envString("BASE_SEPOLIA_RPC_URL");

        vm.createSelectFork(rpcUrl);
        vm.startBroadcast(deployerPrivateKey);

        // base sepolia :: 0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298
        // monad :: 0xBf3bA2b090188B40eF83145Be0e9F30C6ca63689

        address oracle = 0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298;

        USDToken usd = new USDToken();
        Parimutuel parimutuel = new Parimutuel(address(usd), oracle);
        // vm.sleep(30 seconds);

        console.log("----------------------------------------");
        console.log("USD Token deployed to:", address(usd));
        console.log("Parimutuel deployed to:", address(parimutuel));
        console.log("----------------------------------------");

        vm.sleep(180 seconds);

        usd.approve(
            address(parimutuel),
            115792089237316195423570985008687907853269984665640564039457584007913129639935
        );
        console.log("Approved Parimutuel to spend USD tokens");

        parimutuel.shortAddLiquidity(address(0), 5000000000000000);
        parimutuel.longAddLiquidity(address(0), 5000000000000000);
        console.log("Opened initial short and long liquidity");

        vm.stopBroadcast();

        // Add a delay before verification to allow the explorer to index the contracts
        vm.sleep(180 seconds);

        if (block.chainid != 31337) {
            verify(address(usd), "USDToken");
            verify(address(parimutuel), "Parimutuel");
        }

        return parimutuel;
    }

    function verify(
        address contractAddress,
        string memory contractName
    ) internal {
        string[] memory args = new string[](9);
        args[0] = "forge";
        args[1] = "verify-contract";
        args[2] = vm.toString(contractAddress);
        args[3] = contractName;
        args[4] = "--chain";
        args[5] = "base-sepolia";
        args[6] = "--watch";
        args[7] = "--etherscan-api-key";
        args[8] = vm.envString("ETHERSCAN_API_KEY");

        vm.ffi(args);
    }
}
