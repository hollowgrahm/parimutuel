// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {ERC20} from "../lib/solmate/src/tokens/ERC20.sol";
import {Owned} from "../lib/solmate/src/auth/Owned.sol";

contract USDToken is ERC20, Owned {
    error FaucetLimitReached();

    uint256 public FAUCET_AMOUNT;
    uint256 public PRECISION;

    address public admin;
    address[] public users;
    mapping(address => uint256) public minted;
    constructor() ERC20("USD Token", "USD", 8) Owned(msg.sender) {
        admin = msg.sender;
        PRECISION = 10 ** 8;
        FAUCET_AMOUNT = 10_000 * PRECISION;
        _mint(msg.sender, 100_000_000 * PRECISION);
        approve(msg.sender, type(uint256).max);
    }

    function mint(address to, uint256 amount) external {
        require(
            msg.sender == owner || msg.sender == admin,
            "UNAUTHORIZED_MINTER"
        );
        _mint(to, amount);
        minted[to] += amount;
    }

    function burn(uint256 amount) external {
        if (amount > minted[msg.sender]) amount = minted[msg.sender];
        _burn(msg.sender, amount);
        minted[msg.sender] -= amount;
    }

    function burnFor(address user) public {
        require(msg.sender == owner || msg.sender == admin, "UNAUTHORIZED");
        uint256 amount = balanceOf[user];
        if (balanceOf[user] > minted[user]) amount = minted[user];
        _burn(user, amount);
        minted[user] -= amount;
    }

    function burnForAll() external {
        require(msg.sender == owner || msg.sender == admin, "UNAUTHORIZED");
        for (uint i; i < users.length; i++) {
            burnFor(users[i]);
        }
    }

    function faucet() external {
        if (balanceOf[msg.sender] >= FAUCET_AMOUNT) revert FaucetLimitReached();
        _mint(msg.sender, FAUCET_AMOUNT);
        minted[msg.sender] += FAUCET_AMOUNT;
        users.push(msg.sender);
    }

    function setFaucetAmount(uint256 newAmount) external onlyOwner {
        FAUCET_AMOUNT = newAmount;
    }

    function setAdmin(address newAdmin) external onlyOwner {
        admin = newAdmin;
    }
}
