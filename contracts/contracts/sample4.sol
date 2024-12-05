// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/// @title EncryptedCounter4
/// @notice A contract that maintains encrypted counters for each user and is meant for demonstrating how re-encryption works
/// @dev Uses TFHE library for fully homomorphic encryption operations
/// @custom:security Each user can only access and modify their own counter
/// @custom:experimental This contract is experimental and uses FHE technology
contract EncryptedCounter4 is SepoliaZamaFHEVMConfig {
    // Mapping from user address to their encrypted counter value
    mapping(address => euint8) private counters;

    function incrementBy(einput amount, bytes calldata inputProof) public {
        // Initialize counter if it doesn't exist
        if (!TFHE.isInitialized(counters[msg.sender])) {
            counters[msg.sender] = TFHE.asEuint8(0);
        }

        // Convert input to euint8 and add to sender's counter
        euint8 incrementAmount = TFHE.asEuint8(amount, inputProof);
        counters[msg.sender] = TFHE.add(counters[msg.sender], incrementAmount);
        TFHE.allowThis(counters[msg.sender]);
        TFHE.allow(counters[msg.sender], msg.sender);
    }

    function getCounter() public view returns (euint8) {
        // Return the encrypted counter value for the sender
        return counters[msg.sender];
    }
}
