// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {ConfidentialFungibleToken} from "openzeppelin-confidential-contracts/contracts/token/ConfidentialFungibleToken.sol";
import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialToken is SepoliaConfig, ConfidentialFungibleToken {
    constructor(
        address _owner,
        string memory name_,
        string memory symbol_
    ) ConfidentialFungibleToken(name_, symbol_, "") {}

    // Simple mint function that takes a clear amount - this is the working approach
    function mint(address to, uint64 amount) public {
        euint64 encryptedAmount = FHE.asEuint64(amount);
        _mint(to, encryptedAmount);
    }
}
