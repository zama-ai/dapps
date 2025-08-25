# fhEVM dApp Examples

This repository contains example dApps built using fhEVM (Fully Homomorphic EVM). Each example demonstrates different aspects of building privacy-preserving smart contracts using FHE operations.

## Project Structure

The repository contains two main components:

- **`/hardhat`** - Smart contract examples and development environment
- **`/confidentialTransfer`** - React-based frontend dApp for confidential token transfers

> NOTE: `/confidentialTransfer` folder is currently still outdated and it's not v0.7, but v0.6 

## Smart Contract Examples

The `/hardhat` folder contains several privacy-preserving smart contract examples:

### Basic FHE Operations
- **Encryption/Decryption** - Examples of encrypting and decrypting values
- **FHE Operators** - Basic homomorphic operations like addition and conditional logic
- **User Decrypt** - User-side decryption examples
- **Decrypt in Solidity** - On-chain decryption capabilities

### Advanced Applications
- **Confidential Counter** - Progressive examples demonstrating FHE operations from basic to multi-user counters
- **FHE Wordle** - Privacy-preserving word guessing game using encrypted letter comparisons
- **Confidential Auctions** - Multiple auction implementations with encrypted bids:
  - Blind auctions with sealed bids
  - Dutch auctions with descending prices

### Token & Wrapper Contracts
- **Confidential Token Example** - Mock confidential token for testing
- **ERC20 Wrapper** - Wrapper for standard ERC20 tokens
- **ETH Wrapper** - Wrapper for native ETH
- **Faucet Contract** - Test token distribution contract

### Mock Contracts
- **Mock USDZ** - Mock stablecoin implementation
- **Prize Item** - Mock NFT-like contract

Each example includes detailed documentation in its respective README explaining the implementation and FHE usage.

## Contributing

This repository serves as a comprehensive example of building privacy-preserving dApps with fhEVM. Feel free to explore the examples, run the tests, and use them as a foundation for your own projects.

## License

This project is licensed under the BSD-3-Clause-Clear license.
