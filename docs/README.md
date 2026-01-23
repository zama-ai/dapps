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
import { useEncrypt, useFhevmStatus } from "fhevm-sdk";
import { useWriteContract } from "wagmi";

function EncryptedTransfer({ contractAddress, tokenAbi }) {
  const { isReady } = useFhevmStatus();
  const { encrypt } = useEncrypt();
  const { writeContract } = useWriteContract();

  const handleTransfer = async (recipient: string, amount: bigint) => {
    // Encrypt the amount client-side
    const encrypted = await encrypt(amount, contractAddress);
    if (!encrypted) return;

    // Send encrypted value to contract
    writeContract({
      address: contractAddress,
      abi: tokenAbi,
      functionName: "transfer",
      args: [recipient, encrypted.handles[0], encrypted.inputProof],
    });
  };

  return (
    <button
      onClick={() => handleTransfer("0x...", 100n)}
      disabled={!isReady}
    >
      Transfer 100 Tokens
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
