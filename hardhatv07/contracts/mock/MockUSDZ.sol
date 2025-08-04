// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDZ is Ownable, Pausable, ERC20 {
    constructor(string memory name, string memory symbol) Ownable(msg.sender) ERC20(name, symbol) {}

    function mint(address account) public whenNotPaused {
        _mint(account, 10 * 1e6);
    }

    /// @notice Be careful with a decimals higher than 9, it will impact the
    /// wrapped token representation.
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // Owner can pause
    function pause() public onlyOwner {
        _pause();
    }

    // Owner can unpause
    function unpause() public onlyOwner {
        _unpause();
    }
}
