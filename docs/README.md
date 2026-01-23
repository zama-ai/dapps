# fhevm-sdk

A React SDK for building applications with Fully Homomorphic Encryption (FHE) on EVM chains.

## Overview

fhevm-sdk provides wagmi-style hooks for encrypting, decrypting, and managing FHE operations in React applications. It integrates seamlessly with wagmi and TanStack Query for a modern developer experience.

## Features

- **Wagmi-style API** - Familiar patterns for web3 developers
- **Auto-initialization** - FHEVM instance managed automatically
- **TanStack Query integration** - Built-in caching and state management
- **TypeScript support** - Fully typed API
- **Multiple chain support** - Sepolia testnet and local Hardhat development
- **Flexible encryption** - Simple and builder patterns for all FHE types

## Quick Example

```tsx
import { useEncrypt, useUserDecrypt } from "fhevm-sdk";

function EncryptedTransfer({ contractAddress }) {
  const { encrypt, isReady } = useEncrypt();

  const handleTransfer = async (amount: bigint) => {
    const encrypted = await encrypt(amount, contractAddress);
    // Use encrypted.handles[0] and encrypted.inputProof in contract call
  };

  return (
    <button onClick={() => handleTransfer(100n)} disabled={!isReady}>
      Transfer
    </button>
  );
}
```

## Installation

```bash
pnpm add fhevm-sdk
```

## Next Steps

- [Installation](getting-started/installation.md) - Set up your project
- [Quick Start](getting-started/quick-start.md) - Build your first FHE app
- [Hooks API](hooks/use-encrypt.md) - Explore all available hooks
