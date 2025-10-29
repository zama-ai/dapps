// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984ERC20Wrapper} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

import {IsPausable} from "../interfaces/IsPausable.sol";

/// @title ERC20Wrapper
/// @notice A wrapper contract that allows wrapping an ERC20 token into a confidential fungible token
///         with pausable functionality.
/// @dev The pausable functionality is implemented by checking the `paused` state of the underlying ERC20 token.
contract ERC20Wrapper is SepoliaConfig, ERC7984ERC20Wrapper {
    /// @notice Use the underling token's pausable interface to check if the contract is paused.
    IsPausable public immutable pausableToken;

    modifier whenNotPaused() {
        require(!pausableToken.paused(), "Paused");
        _;
    }

    constructor(
        address tokenAddress,
        string memory name,
        string memory symbol,
        string memory uri
    ) ERC7984(name, symbol, uri) ERC7984ERC20Wrapper(IERC20(tokenAddress)) {
        pausableToken = IsPausable(tokenAddress);
    }

    /// @notice This function is used to update the balances of the token after a transfer operation.
    /// @dev We have overridden the `_update` function to include the `whenNotPaused` modifier.
    /// This ensures that the function can only be called when the contract is not paused.
    /// The functions impacted are `confidentialTransfer`, `confidentialTransferFrom`, `confidentialTransferAndCall`,
    /// `confidentialTransferFromAndCall`, `wrap`, `unwrap`, and `onTransferReceived`.
    /// Note that we have exclude the `finalizeUnwrap` function as it should be called by the Gateway contract to
    /// finalize the unwrapping process and sending the unwrapped tokens to the specified address.
    function _update(
        address from,
        address to,
        euint64 amount
    ) internal override whenNotPaused returns (euint64 transferred) {
        return super._update(from, to, amount);
    }
}
