// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { SepoliaZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/// @title Guess Random Number Game
/// @notice A decentralized game where players submit their encrypted guesses to guess the random number
contract GuessRandomNumberGame is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    // uint16 is best suited for this task since -> uint16: 0 to 65,535 (2^16 - 1)
    uint16 public immutable MAX_VALUE;
    uint8 public immutable MIN_PLAYERS;
    euint16 encryptedTarget;
    uint16 public decryptedPreviousTarget; // Decrypted previous encrypted target
    euint16 closestValue; // Closest winning value
    uint16 public closestPreviousWinningValueDecrypted; // Closest previous winning value decrypted
    eaddress closestOwner; // Closest winning owner
    address public closestPreviousWinnerDecrypted; // Closest previous winning address decrypted

    // Adding player scores to make it more fun
    mapping(address => uint256) public playerScores;

    struct Guess {
        euint16 encryptedValue;
        address owner;
    }
    Guess[] public guesses;

    /// @notice Event emitted when a secret is submitted
    event GuessSubmitted(address indexed player, euint16 encryptedValue);

    /// @notice Event emitted when a winner is determined
    event WinnerDeclared(address indexed winner, uint16 winningValue);

    /// @notice Event emitted when game reset
    event GameReset();

    /// @notice Constructor sets a random encrypted target value
    constructor(uint8 _minPlayers, uint16 _max_value) {
        MIN_PLAYERS = _minPlayers;
        MAX_VALUE = _max_value; // Upper bound must be a power of 2
        encryptedTarget = TFHE.randEuint16(MAX_VALUE);
        // Encrypt and store the target value
        TFHE.allowThis(encryptedTarget);
    }

    /// @notice Function to submit the encrypted guess
    /// @param secretValue The encrypted secret value
    /// @param inputProof The ZK proof for the secret
    function submitGuess(einput secretValue, bytes calldata inputProof) public {
        // Check if address has already participated
        for (uint i = 0; i < guesses.length; i++) {
            require(guesses[i].owner != msg.sender, "Address has already participated");
        }

        euint16 validatedGuess = TFHE.asEuint16(secretValue, inputProof);
        // allowing the contract and the user to access this contract later
        TFHE.allowThis(validatedGuess);
        TFHE.allow(validatedGuess, msg.sender);

        // Store the secret
        guesses.push(Guess({ encryptedValue: validatedGuess, owner: msg.sender }));

        emit GuessSubmitted(msg.sender, validatedGuess);
    }

    /// @notice Get the encrypted secret value for the caller
    /// @return The encrypted secret value for the caller
    function getMyGuess() public view returns (euint16) {
        for (uint i = 0; i < guesses.length; i++) {
            if (guesses[i].owner == msg.sender) {
                return guesses[i].encryptedValue;
            }
        }
        revert("No secret found for caller");
    }

    /// @notice Compare all guesses to the encrypted target and determine the winner
    function determineWinner() public {
        require(guesses.length >= MIN_PLAYERS, "Not enough players have submitted guesses");

        closestValue = TFHE.asEuint16(0); // Start with 0 as the closest value
        euint16 smallestDifference = TFHE.asEuint16(MAX_VALUE); // Start with max value
        closestOwner = TFHE.asEaddress(address(this)); // Begin closest owner with this address

        for (uint i = 0; i < guesses.length; i++) {
            euint16 difference = TFHE.select(
                TFHE.gt(guesses[i].encryptedValue, encryptedTarget),
                TFHE.sub(guesses[i].encryptedValue, encryptedTarget),
                TFHE.sub(encryptedTarget, guesses[i].encryptedValue)
            );
            ebool diff_smaller = TFHE.lt(difference, smallestDifference);

            // Use TFHE.select to find the smallest difference
            smallestDifference = TFHE.select(diff_smaller, difference, smallestDifference);

            // Update the closest value and owner if the difference is smaller
            closestValue = TFHE.select(diff_smaller, guesses[i].encryptedValue, closestValue);

            // Update the closest owner
            closestOwner = TFHE.select(diff_smaller, TFHE.asEaddress(guesses[i].owner), closestOwner);
        }

        requestDecrypt();
    }

    /// @notice Request decryption of the encrypted target value, closest value and the closest owner
    function requestDecrypt() internal {
        uint256[] memory cts = new uint256[](3); // 3 indicates how many items do we want to decrypt
        cts[0] = Gateway.toUint256(encryptedTarget);
        cts[1] = Gateway.toUint256(closestValue);
        cts[2] = Gateway.toUint256(closestOwner);
        Gateway.requestDecryption(cts, this.callbackEncryptedTarget.selector, 0, block.timestamp + 100, false);
    }

    /// @notice Callback function for encrypted target decryption
    /// @param _decryptedTarget The decrypted target value
    /// @param _closestValueDecrypted The decrypted owner address
    /// @param _closestOwnerDecrypted The decrypted owner address
    function callbackEncryptedTarget(
        uint256,
        uint16 _decryptedTarget,
        uint16 _closestValueDecrypted,
        address _closestOwnerDecrypted
    ) public onlyGateway {
        decryptedPreviousTarget = _decryptedTarget;
        closestPreviousWinningValueDecrypted = _closestValueDecrypted;
        closestPreviousWinnerDecrypted = _closestOwnerDecrypted;

        // Emit winner information
        emit WinnerDeclared(closestPreviousWinnerDecrypted, closestPreviousWinningValueDecrypted);

        resetGame();
    }

    /// @notice Reset the game state for a new round
    function resetGame() internal {
        // Reset the guesses array
        delete guesses;

        // Reset encrypted values
        closestValue = TFHE.asEuint16(0);
        closestOwner = TFHE.asEaddress(address(0));

        encryptedTarget = TFHE.randEuint16(MAX_VALUE);

        emit GameReset();
    }
}
