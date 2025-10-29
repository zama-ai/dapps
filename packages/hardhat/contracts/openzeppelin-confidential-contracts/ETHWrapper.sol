// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC7984ETHWrapper} from "./ERC7984ETHWrapper.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract ETHWrapper is SepoliaConfig, ERC7984ETHWrapper {
    constructor()
        ERC7984ETHWrapper()
        ERC7984("Confidential Wrapped Ether", "WETHc", "")
    {}
}
