// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/// @title EncryptedCounter1
/// @notice A basic contract demonstrating the setup of encrypted types
/// @dev Uses TFHE library for fully homomorphic encryption operations
/// @custom:experimental This is a minimal example contract intended only for learning purposes
/// @custom:notice This contract has limited real-world utility and serves primarily as a starting point
/// for understanding how to implement basic FHE operations in Solidity
contract EncryptedCounter1 is SepoliaZamaFHEVMConfig {
    euint8 counter;
    euint8 CONST_ONE;

    constructor() {
        // Initialize counter with an encrypted zero value
        counter = TFHE.asEuint8(0);
        TFHE.allowThis(counter);
        // Save on gas by computing the constant here
        CONST_ONE = TFHE.asEuint8(1);
        TFHE.allowThis(CONST_ONE);
    }

    function increment() public {
        // Perform encrypted addition to increment the counter
        counter = TFHE.add(counter, CONST_ONE);
        TFHE.allowThis(counter);
    }
}
