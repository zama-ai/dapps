// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

// Import required FHEVM contracts and libraries
import { SepoliaZamaFHEVMConfig } from "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/// @title Guess Random Number Game
/// @notice A decentralized game where players submit their encrypted guesses to guess the random number
/// @dev Uses FHEVM for fully homomorphic encryption to keep guesses private
contract GuessRandomNumberGame is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    // Game configuration
    uint16 public immutable MAX_VALUE; // Maximum possible value for guesses and target
    uint8 public immutable MIN_PLAYERS; // Minimum number of players required to start game

    // Game state variables
    euint16 encryptedTarget; // The encrypted target number players try to guess
    uint16 public decryptedPreviousTarget; // Stores the previous round's target after decryption
    euint16 closestValue; // Encrypted value of closest guess
    uint16 public closestPreviousWinningValueDecrypted; // Previous round's winning guess after decryption
    eaddress closestOwner; // Encrypted address of player with closest guess
    address public closestPreviousWinnerDecrypted; // Previous round's winner address after decryption

    // Player statistics
    mapping(address => uint256) public playerScores; // Track scores across multiple rounds

    // Structure to store encrypted guesses with their owners
    struct Guess {
        euint16 encryptedValue; // The encrypted guess value
        address owner; // Address of the player who made the guess
    }
    Guess[] public guesses; // Array of all submitted guesses for current round

    // Events
    /// @notice Event emitted when a secret is submitted
    event GuessSubmitted(address indexed player, euint16 encryptedValue);

    /// @notice Event emitted when a winner is determined
    event WinnerDeclared(address indexed winner, uint16 winningValue);

    /// @notice Event emitted when game reset
    event GameReset();

    /// @notice Constructor sets a random encrypted target value
    /// @param _minPlayers Minimum number of players required to start game
    /// @param _max_value Maximum possible value for guesses and target
    constructor(uint8 _minPlayers, uint16 _max_value) {
        MIN_PLAYERS = _minPlayers;
        MAX_VALUE = _max_value; // Upper bound must be a power of 2
        // Generate and store initial encrypted target
        encryptedTarget = TFHE.randEuint16(MAX_VALUE);
        TFHE.allowThis(encryptedTarget);
    }

    /// @notice Function to submit the encrypted guess
    /// @param secretValue The encrypted secret value
    /// @param inputProof The ZK proof for the secret
    /// @dev Validates input and stores encrypted guess
    function submitGuess(einput secretValue, bytes calldata inputProof) public {
        // Prevent multiple submissions from same address
        for (uint i = 0; i < guesses.length; i++) {
            require(guesses[i].owner != msg.sender, "Address has already participated");
        }

        // Validate and store the encrypted guess
        euint16 validatedGuess = TFHE.asEuint16(secretValue, inputProof);
        // Set permissions for contract and user access
        TFHE.allowThis(validatedGuess);
        TFHE.allow(validatedGuess, msg.sender);

        // Store the guess
        guesses.push(Guess({ encryptedValue: validatedGuess, owner: msg.sender }));

        emit GuessSubmitted(msg.sender, validatedGuess);
    }

    /// @notice Get the encrypted secret value for the caller
    /// @return The encrypted secret value for the caller
    /// @dev Allows players to retrieve their own encrypted guess
    function getMyGuess() public view returns (euint16) {
        for (uint i = 0; i < guesses.length; i++) {
            if (guesses[i].owner == msg.sender) {
                return guesses[i].encryptedValue;
            }
        }
        revert("No secret found for caller");
    }

    /// @notice Compare all guesses to the encrypted target and determine the winner
    /// @dev Uses homomorphic operations to find closest guess without revealing values
    function determineWinner() public {
        require(guesses.length >= MIN_PLAYERS, "Not enough players have submitted guesses");

        // Initialize tracking variables
        closestValue = TFHE.asEuint16(0);
        closestOwner = TFHE.asEaddress(address(this));
        euint16 smallestDifference = TFHE.asEuint16(MAX_VALUE);

        // Compare each guess to find closest
        for (uint i = 0; i < guesses.length; i++) {
            // Calculate absolute difference between guess and target
            euint16 difference = TFHE.select(
                TFHE.gt(guesses[i].encryptedValue, encryptedTarget),
                TFHE.sub(guesses[i].encryptedValue, encryptedTarget),
                TFHE.sub(encryptedTarget, guesses[i].encryptedValue)
            );
            ebool diff_smaller = TFHE.lt(difference, smallestDifference);

            // Update tracking variables if new closest guess found
            smallestDifference = TFHE.select(diff_smaller, difference, smallestDifference);
            closestValue = TFHE.select(diff_smaller, guesses[i].encryptedValue, closestValue);
            closestOwner = TFHE.select(diff_smaller, TFHE.asEaddress(guesses[i].owner), closestOwner);
        }

        requestDecrypt();
    }

    /// @notice Request decryption of the encrypted target value, closest value and the closest owner
    /// @dev Sends decryption request to FHEVM gateway
    function requestDecrypt() internal {
        uint256[] memory cts = new uint256[](3);
        cts[0] = Gateway.toUint256(encryptedTarget);
        cts[1] = Gateway.toUint256(closestValue);
        cts[2] = Gateway.toUint256(closestOwner);
        Gateway.requestDecryption(cts, this.callbackEncryptedTarget.selector, 0, block.timestamp + 100, false);
    }

    /// @notice Callback function for encrypted target decryption
    /// @param _decryptedTarget The decrypted target value
    /// @param _closestValueDecrypted The decrypted closest guess value
    /// @param _closestOwnerDecrypted The decrypted winner address
    /// @dev Called by gateway after decryption, updates game state and starts new round
    function callbackEncryptedTarget(
        uint256,
        uint16 _decryptedTarget,
        uint16 _closestValueDecrypted,
        address _closestOwnerDecrypted
    ) public onlyGateway {
        // Store decrypted values
        decryptedPreviousTarget = _decryptedTarget;
        closestPreviousWinningValueDecrypted = _closestValueDecrypted;
        closestPreviousWinnerDecrypted = _closestOwnerDecrypted;

        // Increment winner's score
        playerScores[closestPreviousWinnerDecrypted] += 1;

        // Emit winner information
        emit WinnerDeclared(closestPreviousWinnerDecrypted, closestPreviousWinningValueDecrypted);

        resetGame();
    }

    /// @notice Reset the game state for a new round
    /// @dev Clears all game state and generates new target
    function resetGame() internal {
        // Clear all guesses
        delete guesses;

        // Reset winner tracking
        closestValue = TFHE.asEuint16(0);
        closestOwner = TFHE.asEaddress(address(0));

        // Set permissions
        TFHE.allowThis(closestValue);
        TFHE.allowThis(closestOwner);

        // Generate new target
        encryptedTarget = TFHE.randEuint16(MAX_VALUE);
        TFHE.allowThis(encryptedTarget);

        emit GameReset();
    }
}
