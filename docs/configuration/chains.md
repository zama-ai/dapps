# Chains

fhevm-sdk supports multiple chains for FHE operations.

## Pre-configured Chains

### Sepolia (Production)

Ethereum Sepolia testnet with Zama's FHE infrastructure:

```tsx
import { sepolia } from "fhevm-sdk";

// Chain ID: 11155111
// Gateway: https://gateway.sepolia.zama.ai
// Relayer: https://relayer.sepolia.zama.ai
```

### Hardhat Local (Development)

Local Hardhat node for development:

```tsx
import { hardhatLocal } from "fhevm-sdk";

// Chain ID: 31337
// RPC: http://localhost:8545
// Auto-fetches contract addresses from hardhat node
```

## Custom Chains

### Mock Chain (Development)

For local development without real FHE infrastructure:

```tsx
import { defineMockChain } from "fhevm-sdk";

const myLocalChain = defineMockChain({
  id: 31337,
  name: "My Local Chain",
  network: "local",
  rpcUrl: "http://localhost:8545",
});
```

Mock chains:

- Simulate FHE operations locally
- Auto-fetch contract addresses via RPC
- Don't require real FHE infrastructure

### Production Chain

For production deployments with real FHE infrastructure:

```tsx
import { defineProductionChain } from "fhevm-sdk";

const myProductionChain = defineProductionChain({
  id: 1,
  name: "Mainnet",
  network: "mainnet",
  gatewayUrl: "https://gateway.example.com",
  relayerUrl: "https://relayer.example.com",
  aclAddress: "0x...",
  kmsVerifierAddress: "0x...",
  inputVerifierAddress: "0x...",
});
```

Production chains require:

| Property               | Description                    |
| ---------------------- | ------------------------------ |
| `gatewayUrl`           | Zama gateway URL               |
| `relayerUrl`           | Zama relayer URL               |
| `aclAddress`           | ACL contract address           |
| `kmsVerifierAddress`   | KMS verifier contract address  |
| `inputVerifierAddress` | Input verifier contract address |

### Custom Hardhat Chain

Create a Hardhat chain with a custom RPC URL:

```tsx
import { createHardhatChain } from "fhevm-sdk";

const customHardhat = createHardhatChain({
  rpcUrl: "http://192.168.1.100:8545",
});
```

## Chain Type

```tsx
type FhevmChain = {
  id: number;
  name: string;
  network: string;
  isMock: boolean;
  rpcUrl?: string;
  aclAddress?: `0x${string}`;
  gatewayUrl?: string;
  kmsVerifierAddress?: `0x${string}`;
  inputVerifierAddress?: `0x${string}`;
  relayerUrl?: string;
};
```

## Type Guards

```tsx
import { isMockChain, isProductionChain } from "fhevm-sdk";

if (isMockChain(chain)) {
  // chain.rpcUrl is available
}

if (isProductionChain(chain)) {
  // All FHE infrastructure addresses are available
}
```
