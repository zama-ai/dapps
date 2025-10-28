// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title IsPausable Interface
/// @notice Provides a standard way to query paused state of a contract.
/// @dev Can be used to interact with contracts implementing OpenZeppelin's Pausable
interface IsPausable {

    /// @notice Returns true if the contract is paused
    function paused() external view returns (bool);
}

