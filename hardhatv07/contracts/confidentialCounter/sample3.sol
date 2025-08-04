// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedCounter3
/// @notice A contract that maintains an encrypted counter and is meant for demonstrating how decryption works
/// @dev Uses TFHE library for fully homomorphic encryption operations and Gateway for decryption
/// @custom:experimental This contract is experimental and uses FHE technology with decryption capabilities
contract EncryptedCounter3 is SepoliaConfig {
    /// @dev Decrypted state variable
    euint8 counter;
    uint8 public decryptedCounter;

    function incrementBy(externalEuint8 amount, bytes calldata inputProof) public {
        // Convert input to euint8 and add to counter
        euint8 incrementAmount = FHE.fromExternal(amount, inputProof);
        counter = FHE.add(counter, incrementAmount);
        FHE.allowThis(counter);
    }

    /// @notice Request decryption of the counter value
    function requestDecryptCounter() public {
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(counter);

        FHE.requestDecryption(cts, this.callbackCounter.selector);
    }

    /// @notice Callback function for counter decryption
    /// @param decryptedInput The decrypted counter value
    /// @return The decrypted value
    function callbackCounter(
        uint256 requestID,
        uint8 decryptedInput,
        bytes[] memory signatures
    ) external returns (uint8) {
        FHE.checkSignatures(requestID, signatures);
        decryptedCounter = decryptedInput;
        return decryptedInput;
    }

    /// @notice Get the decrypted counter value
    /// @return The decrypted counter value
    function getDecryptedCounter() public view returns (uint8) {
        return decryptedCounter;
    }
}
