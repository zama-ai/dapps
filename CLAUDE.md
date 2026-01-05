# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing fhEVM (Fully Homomorphic EVM) dApp examples. It demonstrates building privacy-preserving smart contracts using Zama's FHE (Fully Homomorphic Encryption) operations. Uses pnpm workspaces.

## Commands

### Development
```bash
pnpm install              # Install all dependencies (builds SDK first via preinstall)
pnpm chain                # Start local Hardhat node (localhost:8545, chainId 31337)
pnpm deploy:localhost     # Deploy contracts to localhost and generate TypeScript ABIs
pnpm deploy:sepolia       # Deploy to Sepolia testnet
pnpm start                # Start Next.js frontend (localhost:3000)
```

### Smart Contracts (packages/hardhat)
```bash
pnpm compile              # Compile Solidity contracts
pnpm test                 # Run all Hardhat tests (mock mode only)
pnpm hardhat:test         # Same as above

# Run single test file
cd packages/hardhat && npx hardhat test test/FHECounter.ts

# Sepolia-specific
pnpm test:sepolia         # Run tests on Sepolia (from hardhat package)
pnpm verify:sepolia       # Verify contracts on Etherscan
```

### SDK (packages/fhevm-sdk)
```bash
pnpm sdk:build            # Build SDK
pnpm sdk:watch            # Build in watch mode
pnpm sdk:test             # Run Vitest tests
pnpm sdk:test:watch       # Run tests in watch mode
```

### Frontend (packages/erc7984example)
```bash
pnpm next:build           # Production build
pnpm next:lint            # ESLint
pnpm next:check-types     # TypeScript type checking
```

### Formatting & Linting
```bash
pnpm format               # Format all code (Prettier)
pnpm lint                 # Lint frontend and contracts
```

## Architecture

### Monorepo Structure
- **packages/hardhat** - Solidity smart contracts with FHE operations, Hardhat config, deploy scripts, and tests
- **packages/fhevm-sdk** - Internal TypeScript SDK wrapping Zama's FHE operations for React apps
- **packages/erc7984example** - Next.js frontend demonstrating ERC7984 confidential token interactions

### Key Dependencies
- **@fhevm/solidity** and **@fhevm/hardhat-plugin** - Zama's FHE smart contract libraries
- **openzeppelin-confidential-contracts** - OpenZeppelin's confidential token implementations (ERC7984)
- **@zama-fhe/relayer-sdk** - Handles encrypted transaction relaying
- **viem/wagmi/rainbowkit** - Frontend Web3 stack

### Smart Contract Categories
- `contracts/basic/` - FHE operation examples (encrypt, decrypt, operators)
- `contracts/auctions/` - Confidential auction implementations (blind, Dutch)
- `contracts/openzeppelin-confidential-contracts/` - ERC7984 token wrappers and examples
- `contracts/fheWordle/` - Privacy-preserving Wordle game
- `contracts/mock/` - Test tokens (ERC20Mock, MockUSDZ)

### Test Patterns
Tests use `@fhevm/hardhat-plugin` mock mode. Check `fhevm.isMock` to skip tests that require real network:
```typescript
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

if (!fhevm.isMock) {
  this.skip();
}
```

Use `fhevm.createEncryptedInput()` to create encrypted values and `fhevm.userDecryptEuint()` to decrypt for assertions:
```typescript
// Encrypt input for contract call
const encrypted = await fhevm
  .createEncryptedInput(contractAddress, signerAddress)
  .add32(value)
  .encrypt();
await contract.someMethod(encrypted.handles[0], encrypted.inputProof);

// Decrypt for test assertions
const decrypted = await fhevm.userDecryptEuint(
  FhevmType.euint32,
  encryptedValue,
  contractAddress,
  signer,
);
```

### Deployment
Deploy scripts in `packages/hardhat/deploy/`. Contract addresses are written to `packages/erc7984example/contracts/deployedContracts.ts` via `pnpm generate`.

### Environment Variables
**Hardhat**: Set via `npx hardhat vars set VARIABLE_NAME`
- `MNEMONIC` - Wallet mnemonic
- `INFURA_API_KEY` - For Sepolia RPC
- `ETHERSCAN_API_KEY` - For contract verification

**Frontend** (.env.local in packages/erc7984example):
- `NEXT_PUBLIC_ALCHEMY_API_KEY` - Required in production
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - Optional

## Network Configuration

| Network | Chain ID | RPC |
|---------|----------|-----|
| Hardhat Local | 31337 | http://127.0.0.1:8545 |
| Sepolia | 11155111 | Via Infura |

## Solidity

- Version: 0.8.27
- EVM version: cancun
- Optimizer: enabled (800 runs)
