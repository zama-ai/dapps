// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

interface IERC7984Mintable {
    function mint(address to, uint64 amount) external;
}

/// @title Airdrop
/// @notice Airdrop contract for confidential tokens
contract Airdrop is ZamaEthereumConfig, Ownable, ReentrancyGuard {
    // mapping(user => token => claimed)
    mapping(address => mapping(address => bool)) public alreadyClaimed;

    // Fixed airdrop amount: 100 tokens with 6 decimals
    uint64 public constant AIRDROP_AMOUNT = 100_000_000;

    error AlreadyClaimed();
    error InvalidToken();

    modifier onlyNotClaimed(address _token) {
        if (alreadyClaimed[msg.sender][_token]) revert AlreadyClaimed();
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor() Ownable(msg.sender) {}

    function claim(address _token) external nonReentrant onlyNotClaimed(_token) {
        if (_token == address(0)) revert InvalidToken();

        // Mark as claimed for this specific token
        alreadyClaimed[msg.sender][_token] = true;

        // Mint tokens directly to the user
        IERC7984Mintable(_token).mint(msg.sender, AIRDROP_AMOUNT);
    }

    // View function to check if user has claimed for a specific token
    function hasClaimed(address user, address token) external view returns (bool) {
        return alreadyClaimed[user][token];
    }
}
