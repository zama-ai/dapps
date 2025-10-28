// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ConfidentialFungibleTokenETHWrapper} from "./ConfidentialFungibleTokenETHWrapper.sol";
import {ConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/token/ConfidentialFungibleToken.sol";

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ETHWrapper is SepoliaConfig, ConfidentialFungibleTokenETHWrapper {
    constructor()
        ConfidentialFungibleTokenETHWrapper()
        ConfidentialFungibleToken("Confidential Wrapped Ether", "WETHc", "")
    {}
}
