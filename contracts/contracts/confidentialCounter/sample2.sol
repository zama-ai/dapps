// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/// @title EncryptedCounter2
/// @notice A contract that maintains an encrypted counter and is meant for demonstrating how to add encrypted types
/// @dev Uses TFHE library for fully homomorphic encryption operations
/// @custom:experimental This contract is experimental and uses FHE technology
contract EncryptedCounter2 is SepoliaZamaFHEVMConfig {
    euint8 counter;

    constructor() {
        // Initialize counter with an encrypted zero value
        counter = TFHE.asEuint8(0);
        TFHE.allowThis(counter);
    }

    function incrementBy(einput amount, bytes calldata inputProof) public {
        // Convert input to euint8 and add to counter
        euint8 incrementAmount = TFHE.asEuint8(amount, inputProof);
        counter = TFHE.add(counter, incrementAmount);
        TFHE.allowThis(counter);
    }
}
