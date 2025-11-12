// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {FHE, euint16, euint32, euint64, euint128, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Airdrop
/// @notice Airdrop contract for confidential tokens
contract Airdrop is SepoliaConfig, Ownable, ReentrancyGuard {
    // mapping(user => token => claimed)
    mapping(address => mapping(address => bool)) public alreadyClaimed;

    // Fixed airdrop amount per token (encrypted)
    euint64 private immutable AIRDROP_AMOUNT;

    error AlreadyClaimed();
    error InvalidToken();

    modifier onlyNotClaimed(address _token) {
        if (alreadyClaimed[msg.sender][_token]) revert AlreadyClaimed();
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor() Ownable(msg.sender) {
        // Set airdrop amount to 100 tokens (with 6 decimals = 100_000_000)
        AIRDROP_AMOUNT = FHE.asEuint64(100_000_000);
        FHE.allowThis(AIRDROP_AMOUNT);
    }

    function claim(address _token) external nonReentrant onlyNotClaimed(_token) {
        if (_token == address(0)) revert InvalidToken();

        // Mark as claimed for this specific token
        alreadyClaimed[msg.sender][_token] = true;

        // Allow the token contract to access the encrypted amount
        FHE.allow(AIRDROP_AMOUNT, _token);

        // Transfer fixed amount (100 tokens)
        IERC7984(_token).confidentialTransfer(msg.sender, AIRDROP_AMOUNT);
    }

    // View function to check if user has claimed for a specific token
    function hasClaimed(address user, address token) external view returns (bool) {
        return alreadyClaimed[user][token];
    }
}
