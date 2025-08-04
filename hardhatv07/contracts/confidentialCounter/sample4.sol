// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedCounter4
/// @notice A contract that maintains encrypted counters for each user and is meant for demonstrating how re-encryption works
/// @dev Uses TFHE library for fully homomorphic encryption operations
/// @custom:security Each user can only access and modify their own counter
/// @custom:experimental This contract is experimental and uses FHE technology
contract EncryptedCounter4 is SepoliaConfig {
    // Mapping from user address to their encrypted counter value
    mapping(address => euint8) private counters;

    function incrementBy(externalEuint8 amount, bytes calldata inputProof) public {
        // Convert input to euint8 and add to sender's counter
        euint8 incrementAmount = FHE.fromExternal(amount, inputProof);
        counters[msg.sender] = FHE.add(counters[msg.sender], incrementAmount);
        FHE.allowThis(counters[msg.sender]);
        FHE.allow(counters[msg.sender], msg.sender);
    }

    function getCounter() public view returns (euint8) {
        // Return the encrypted counter value for the sender
        return counters[msg.sender];
    }
}
