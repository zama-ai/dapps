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
    uint16 public constant MAX_VAlUE = 1024; // Upper bound must be a power of 2
    uint8 public immutable MIN_PLAYERS;
    euint16 encryptedTarget;
    uint16 public decryptedPreviousTarget; // Decrypted previous encrypted target
    euint16 closestValue; // Closest winning value
    uint16 public closestPreviousWinningValueDecrypted; // Closest previous winning value decrypted
    eaddress closestOwner; // Closest winning owner
    address public closestPreviousWinnerDecrypted; // Closest previous winning address decrypted

    // Adding player scores to make it more fun
    mapping(address => uint256) public playerScores;

    struct Secret {
        euint16 encryptedValue;
        address owner;
    }
    Secret[] public secrets;

    /// @notice Event emitted when a secret is submitted
    event SecretSubmitted(address indexed player, euint16 encryptedValue);

    /// @notice Event emitted when a winner is determined
    event WinnerDeclared(address indexed winner, uint16 winningValue);

    /// @notice Event emitted when game reset
    event GameReset();

    /// @notice Constructor sets a random encrypted target value
    constructor(uint8 _minPlayers) {
        MIN_PLAYERS = _minPlayers;
        encryptedTarget = TFHE.randEuint16(MAX_VAlUE);
        // Encrypt and store the target value
        TFHE.allowThis(encryptedTarget);
    }

    /// @notice Function to submit the encrypted guess
    /// @param secretValue The encrypted secret value
    /// @param inputProof The ZK proof for the secret
    function submitGuess(einput secretValue, bytes calldata inputProof) public {
        // Check if address has already participated
        for (uint i = 0; i < secrets.length; i++) {
            require(secrets[i].owner != msg.sender, "Address has already participated");
        }

        euint16 validatedSecret = TFHE.asEuint16(secretValue, inputProof);
        // allowing the contract and the user to access this contract later
        TFHE.allowThis(validatedSecret);
        TFHE.allow(validatedSecret, msg.sender);

        // Store the secret
        secrets.push(Secret({ encryptedValue: validatedSecret, owner: msg.sender }));

        emit SecretSubmitted(msg.sender, validatedSecret);
    }

    /// @notice Get the encrypted secret value for the caller
    /// @return The encrypted secret value for the caller
    function getMySecret() public view returns (euint16) {
        for (uint i = 0; i < secrets.length; i++) {
            if (secrets[i].owner == msg.sender) {
                return secrets[i].encryptedValue;
            }
        }
        revert("No secret found for caller");
    }

    /// @notice Compare all secrets to the encrypted target and determine the winner
    function determineWinner() public {
        require(secrets.length >= MIN_PLAYERS, "Not enough players have submitted guesses");

        closestValue = TFHE.asEuint16(0); // Start with 0 as the closest value
        euint16 smallestDifference = TFHE.asEuint16(MAX_VAlUE); // Start with max value
        closestOwner = TFHE.asEaddress(address(this)); // Begin closest owner with this address

        for (uint i = 0; i < secrets.length; i++) {
            euint16 difference = TFHE.select(
                TFHE.gt(secrets[i].encryptedValue, encryptedTarget),
                TFHE.sub(secrets[i].encryptedValue, encryptedTarget),
                TFHE.sub(encryptedTarget, secrets[i].encryptedValue)
            );
            ebool diff_smaller = TFHE.lt(difference, smallestDifference);

            // Use TFHE.select to find the smallest difference
            smallestDifference = TFHE.select(diff_smaller, difference, smallestDifference);

            // Update the closest value and owner if the difference is smaller
            closestValue = TFHE.select(diff_smaller, secrets[i].encryptedValue, closestValue);

            // Update the closest owner
            closestOwner = TFHE.select(diff_smaller, TFHE.asEaddress(secrets[i].owner), closestOwner);
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
        // Reset the secrets array
        delete secrets;

        // Reset encrypted values
        closestValue = TFHE.asEuint16(0);
        closestOwner = TFHE.asEaddress(address(0));

        encryptedTarget = TFHE.randEuint16(MAX_VAlUE);

        emit GameReset();
    }
}
