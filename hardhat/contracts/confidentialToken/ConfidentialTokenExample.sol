// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/token/ConfidentialFungibleToken.sol";

/// @title ConfidentialTokenExample
/// @notice Example confidential fungible token leveraging FHE-based primitives.
/// @dev Inherits `ConfidentialFungibleToken` for encrypted balances and `Ownable2Step` for
/// ownership management. Mints an initial encrypted supply to the deployer. Allows for minting
// later by the owner. Grants the owner viewing permission on confidential total supply after each state update.
contract ConfidentialTokenExample is SepoliaConfig, ConfidentialFungibleToken, Ownable2Step {
    /// @notice Deploys the token and mints an initial supply to the deployer.
    /// @param amount Initial plaintext supply to be minted to `msg.sender`.
    /// @param name_ Token name.
    /// @param symbol_ Confidential token symbol.
    /// @param tokenURI_ Optional token metadata URI used by the confidential token base.
    constructor(
        uint64 amount,
        string memory name_,
        string memory symbol_,
        string memory tokenURI_
    ) ConfidentialFungibleToken(name_, symbol_, tokenURI_) Ownable(msg.sender) {
        euint64 encryptedAmount = FHE.asEuint64(amount);
        _mint(msg.sender, encryptedAmount);
    }

    /// @notice Mints new tokens by taking a plaintext amount
    /// @param to Address to mint tokens to
    /// @param amount Plaintext amount to mint
    function mint(address to, uint64 amount) external onlyOwner {
        euint64 encryptedAmount = FHE.asEuint64(amount);
        _mint(to, encryptedAmount);
    }

    /// @inheritdoc ConfidentialFungibleToken
    /// @dev Extends base behavior to allow the `owner()` to view the confidential total supply
    /// after any balance update. This does not reveal per-account balances.
    function _update(address from, address to, euint64 amount) internal virtual override returns (euint64 transferred) {
        transferred = super._update(from, to, amount);
        FHE.allow(confidentialTotalSupply(), owner());
    }
}
