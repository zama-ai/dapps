# Configuration Overview

fhevm-sdk uses a configuration object to define supported chains and storage options.

## Creating a Config

Use `createFhevmConfig` to create a configuration:

```tsx
import { createFhevmConfig, sepolia, hardhatLocal } from "fhevm-sdk";

const config = createFhevmConfig({
  chains: [sepolia, hardhatLocal],
});
```

## Configuration Options

| Option    | Type                    | Default                         | Description                              |
| --------- | ----------------------- | ------------------------------- | ---------------------------------------- |
| `chains`  | `readonly FhevmChain[]` | Required                        | Supported chains (at least one required) |
| `storage` | `FhevmStorage`          | `localStorage` or `noopStorage` | Storage for decryption signatures        |
| `ssr`     | `boolean`               | `false`                         | Enable SSR-safe mode                     |

## Full Example

```tsx
import {
  createFhevmConfig,
  sepolia,
  hardhatLocal,
  createStorage,
} from "fhevm-sdk";

const config = createFhevmConfig({
  // Supported chains
  chains: [sepolia, hardhatLocal],

  // Custom storage (optional)
  storage: createStorage({
    storage: window.localStorage,
    key: "my-app-fhevm",
  }),

  // SSR mode (optional)
  ssr: false,
});
```

## Config Methods

The returned config object provides these methods:

```tsx
// Get chain by ID
const chain = config.getChain(11155111); // Returns FhevmChain | undefined

// Check if chain is mock
const isMock = config.isMockChain(31337); // Returns boolean

// Get mock chain RPC URL
const rpcUrl = config.getMockRpcUrl(31337); // Returns string | undefined
```

## Next Steps

- [Chains](chains.md) - Configure chain support
- [Storage](storage.md) - Configure signature storage
