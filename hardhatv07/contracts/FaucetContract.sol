// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FaucetContract is Ownable {

    uint256 public constant FAUCET_AMOUNT = 0.01 ether;

    mapping(address account => bool) public alreadyRequested;


    constructor () Ownable(msg.sender) {}

    function request(address account) external {
        require(!alreadyRequested[account], "ALREADY_REQUESTED");
        alreadyRequested[account] = true;

        (bool sent, ) = payable(account).call{value: FAUCET_AMOUNT}("");
        require(sent, "Failed to send Ether");
    }

    receive() external payable {}

    function getBackETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        (bool sent, ) = owner().call{value: balance}("");
        require(sent, "Failed to send Ether");
    }
}