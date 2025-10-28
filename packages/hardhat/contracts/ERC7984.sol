// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/token/ConfidentialFungibleToken.sol";

contract ERC7984Example is SepoliaConfig, ConfidentialFungibleToken, Ownable2Step {
    constructor(
        uint64 amount
    ) ConfidentialFungibleToken("GOLD_token", "GLD", "") Ownable(msg.sender) {
        _mint(msg.sender, FHE.asEuint64(amount));
    }
}