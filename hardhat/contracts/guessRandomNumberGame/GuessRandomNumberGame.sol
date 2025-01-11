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
    uint64 public constant MAX_VAlUE = 1024; // Upper bound must be a power of 2
    euint64 encryptedTarget;
    uint64 public decryptedTarget;

    struct Secret {
        euint64 encryptedValue;
        address owner;
    }
    Secret[] public secrets;

    /// @notice Event emitted when a secret is submitted
    event SecretSubmitted(address indexed player, euint64 encryptedValue);

    /// @notice Event emitted when a winner is determined
    event WinnerDeclared(address indexed winner, euint64 winningValue);

    /// @notice Constructor sets a random encrypted target value
    constructor() {
        encryptedTarget = TFHE.randEuint64(MAX_VAlUE);
        // Encrypt and store the target value
        TFHE.allowThis(encryptedTarget);
    }

    /// @notice Function to submit an encrypted secret
    /// @param secretValue The encrypted secret value
    /// @param inputProof The ZK proof for the secret
    function submitSecret(einput secretValue, bytes calldata inputProof) public {
        euint64 validatedSecret = TFHE.asEuint64(secretValue, inputProof);
        // allowing the contract and the user to access this contract later
        TFHE.allowThis(validatedSecret);
        TFHE.allow(validatedSecret, msg.sender);

        // Store the secret
        secrets.push(Secret({ encryptedValue: validatedSecret, owner: msg.sender }));

        emit SecretSubmitted(msg.sender, validatedSecret);
    }

    /// @notice Get the encrypted secret value for the caller
    /// @return The encrypted secret value for the caller
    function getMySecret() public view returns (euint64) {
        for (uint i = 0; i < secrets.length; i++) {
            if (secrets[i].owner == msg.sender) {
                return secrets[i].encryptedValue;
            }
        }
        revert("No secret found for caller");
    }

    /// @notice Compare all secrets to the encrypted target and determine the winner
    /// @return winner The address of the winner
    function determineWinner() public returns (address winner) {
        require(secrets.length > 0, "No secrets submitted");

        euint64 closestValue = TFHE.asEuint64(0); // Start with 0 as the closest value
        euint64 smallestDifference = TFHE.asEuint64(MAX_VAlUE); // Start with max value
        address closestOwner;

        for (uint i = 0; i < secrets.length; i++) {
            euint64 difference = TFHE.sub(secrets[i].encryptedValue, encryptedTarget);
            ebool diff_smaller = TFHE.lt(difference, smallestDifference);

            // Use TFHE.select to find the smallest difference
            smallestDifference = TFHE.select(diff_smaller, difference, smallestDifference);

            // Update the closest value and owner if the difference is smaller
            closestValue = TFHE.select(diff_smaller, secrets[i].encryptedValue, closestValue);

            // closestOwner = TFHE.select(diff_smaller, secrets[i].owner, closestOwner);
        }

        closestOwner = msg.sender;
        // Emit winner information
        // emit WinnerDeclared(closestOwner, closestValue);
        return closestOwner;
    }

    /// @notice Request decryption of the encrypted target value
    function requestDecryptEncryptedTarget() public {
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(encryptedTarget);
        Gateway.requestDecryption(cts, this.callbackEncryptedTarget.selector, 0, block.timestamp + 100, false);
    }

    /// @notice Callback function for encrypted target decryption
    /// @param decryptedInput The decrypted target value
    /// @return The decrypted value
    function callbackEncryptedTarget(uint256, uint64 decryptedInput) public onlyGateway returns (uint64) {
        decryptedTarget = decryptedInput;
        return decryptedInput;
    }
}
