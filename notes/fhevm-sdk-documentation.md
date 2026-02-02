# fhevm-sdk Documentation

A React SDK for building applications with Fully Homomorphic Encryption (FHE) on EVM chains. Provides wagmi-style hooks for encrypting, decrypting, and managing FHE operations.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Configuration](#configuration)
3. [Provider Setup](#provider-setup)
4. [Hooks API Reference](#hooks-api-reference)
5. [Types Reference](#types-reference)
6. [Migration Guide](#migration-guide)

---

## Quick Start

### Installation

```bash
pnpm add fhevm-sdk
```

### Basic Setup

```tsx
// 1. Create config
import { createFhevmConfig, sepolia, hardhatLocal } from "fhevm-sdk";

const fhevmConfig = createFhevmConfig({
  chains: [sepolia, hardhatLocal],
});

// 2. Wrap your app with FhevmProvider (after WagmiProvider)
import { FhevmProvider } from "fhevm-sdk";
import { useAccount } from "wagmi";

function App({ children }) {
  const { isConnected, chainId, address } = useAccount();

  return (
    <FhevmProvider
      config={fhevmConfig}
      wagmi={{ isConnected, chainId, address }}
    >
      {children}
    </FhevmProvider>
  );
}

// 3. Use hooks in your components
import { useEncrypt, useUserDecrypt, useFhevmStatus } from "fhevm-sdk";

function TransferForm({ contractAddress }) {
  const { encrypt, isReady } = useEncrypt();
  const { status } = useFhevmStatus();

  const handleTransfer = async (amount: bigint) => {
    if (!isReady) return;

    // Encrypt the amount (defaults to uint64)
    const encrypted = await encrypt(amount, contractAddress);
    if (!encrypted) return;

    // Use encrypted.handles[0] and encrypted.inputProof in contract call
    await writeContract({
      address: contractAddress,
      abi: myContractAbi,
      functionName: "transfer",
      args: [recipient, encrypted.handles[0], encrypted.inputProof],
    });
  };

  return (
    <button onClick={() => handleTransfer(100n)} disabled={!isReady}>
      {status === "initializing" ? "Initializing..." : "Transfer"}
    </button>
  );
}
```

### Decrypting Values

```tsx
function BalanceDisplay({ handle, contractAddress }) {
  const { decrypt, results, isDecrypting, canDecrypt } = useUserDecrypt({
    handle,
    contractAddress,
  });

  const balance = handle ? results[handle] : undefined;

  return (
    <div>
      <p>Balance: {balance?.toString() ?? "Encrypted"}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        {isDecrypting ? "Decrypting..." : "Decrypt"}
      </button>
    </div>
  );
}
```

---

## Configuration

### createFhevmConfig

Creates a configuration object for the FhevmProvider.

```tsx
import { createFhevmConfig, sepolia, hardhatLocal, createStorage } from "fhevm-sdk";

const config = createFhevmConfig({
  // Required: at least one chain
  chains: [sepolia, hardhatLocal],

  // Optional: storage for persisting decryption signatures
  storage: createStorage({ storage: window.localStorage }),

  // Optional: enable SSR mode
  ssr: false,
});
```

#### Options

| Option    | Type                      | Default                    | Description                                |
| --------- | ------------------------- | -------------------------- | ------------------------------------------ |
| `chains`  | `readonly FhevmChain[]`   | Required                   | Supported chains (at least one required)   |
| `storage` | `FhevmStorage`            | `localStorage` or `noopStorage` | Storage for decryption signatures    |
| `ssr`     | `boolean`                 | `false`                    | Enable SSR-safe mode                       |

### Pre-configured Chains

#### Sepolia (Production)

```tsx
import { sepolia } from "fhevm-sdk";

// Chain ID: 11155111
// Gateway: https://gateway.sepolia.zama.ai
// Relayer: https://relayer.sepolia.zama.ai
```

#### Hardhat Local (Development)

```tsx
import { hardhatLocal } from "fhevm-sdk";

// Chain ID: 31337
// RPC: http://localhost:8545
// Auto-fetches contract addresses from hardhat node
```

### Custom Chains

#### Mock Chain (Development)

```tsx
import { defineMockChain } from "fhevm-sdk";

const myMockChain = defineMockChain({
  id: 31337,
  name: "My Local Chain",
  network: "local",
  rpcUrl: "http://localhost:8545",
});
```

#### Production Chain

```tsx
import { defineProductionChain } from "fhevm-sdk";

const myProductionChain = defineProductionChain({
  id: 11155111,
  name: "My Production Chain",
  network: "mainnet",
  gatewayUrl: "https://gateway.example.com",
  relayerUrl: "https://relayer.example.com",
  aclAddress: "0x...",
  kmsVerifierAddress: "0x...",
  inputVerifierAddress: "0x...",
});
```

### Storage Options

#### Web Storage (Default for Browser)

```tsx
import { createStorage } from "fhevm-sdk";

const storage = createStorage({
  storage: window.localStorage, // or sessionStorage
  key: "fhevm", // optional prefix
});
```

#### Memory Storage (Testing)

```tsx
import { createMemoryStorage } from "fhevm-sdk";

const storage = createMemoryStorage();
```

#### No-op Storage (SSR)

```tsx
import { noopStorage } from "fhevm-sdk";

// Used automatically in SSR mode
const config = createFhevmConfig({
  chains: [sepolia],
  storage: noopStorage,
  ssr: true,
});
```

---

## Provider Setup

### FhevmProvider

Wraps your application to provide FHEVM context to all hooks.

```tsx
import { FhevmProvider } from "fhevm-sdk";
import { useAccount } from "wagmi";

function Providers({ children }) {
  const { isConnected, chainId, address } = useAccount();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <FhevmProvider
          config={fhevmConfig}
          wagmi={{ isConnected, chainId, address }}
        >
          {children}
        </FhevmProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

#### Props

| Prop       | Type                                              | Default            | Description                              |
| ---------- | ------------------------------------------------- | ------------------ | ---------------------------------------- |
| `config`   | `FhevmConfig`                                     | Required           | Config from `createFhevmConfig()`        |
| `children` | `ReactNode`                                       | Required           | Child components                         |
| `wagmi`    | `{ isConnected, chainId, address }`               | `undefined`        | Wagmi state for auto-initialization      |
| `provider` | `EIP1193Provider`                                 | `window.ethereum`  | EIP-1193 provider                        |
| `autoInit` | `boolean`                                         | `true`             | Auto-initialize when wallet connects     |

#### Provider Hierarchy

The recommended provider hierarchy:

```
WagmiProvider
  └── QueryClientProvider
      └── FhevmProvider
          └── Your App
```

---

## Hooks API Reference

### useEncrypt

Hook for encrypting values for FHE contract calls.

```tsx
import { useEncrypt } from "fhevm-sdk";

function MyComponent() {
  const { encrypt, encryptBatch, encryptWith, isReady, mutation } = useEncrypt();
}
```

#### Returns

| Property       | Type                                          | Description                           |
| -------------- | --------------------------------------------- | ------------------------------------- |
| `isReady`      | `boolean`                                     | Whether encryption is ready           |
| `encrypt`      | `(value, contract) => Promise<EncryptedInput>` | Encrypt a single value               |
| `encryptBatch` | `(inputs[], contract) => Promise<EncryptedInput>` | Encrypt multiple values           |
| `encryptWith`  | `(contract, buildFn) => Promise<EncryptedInput>` | Builder pattern for advanced use   |
| `mutation`     | `EncryptMutationState`                        | TanStack Query mutation state         |

#### encrypt()

Supports two calling patterns:

```tsx
// Simple - defaults to uint64
const encrypted = await encrypt(100n, contractAddress);

// With explicit type
const encrypted = await encrypt("uint128", 100n, contractAddress);
```

#### encryptBatch()

Encrypt multiple values at once:

```tsx
const encrypted = await encryptBatch(
  [
    { type: "uint64", value: 100n },
    { type: "address", value: "0x..." },
  ],
  contractAddress
);
```

#### encryptWith()

Builder pattern for full control:

```tsx
const encrypted = await encryptWith(contractAddress, (builder) => {
  builder.add64(100n);
  builder.addAddress("0x...");
});
```

#### Supported Types

| Type      | Builder Method | Value Type                |
| --------- | -------------- | ------------------------- |
| `bool`    | `addBool()`    | `boolean`                 |
| `uint8`   | `add8()`       | `number \| bigint`        |
| `uint16`  | `add16()`      | `number \| bigint`        |
| `uint32`  | `add32()`      | `number \| bigint`        |
| `uint64`  | `add64()`      | `number \| bigint`        |
| `uint128` | `add128()`     | `bigint`                  |
| `uint256` | `add256()`     | `bigint`                  |
| `address` | `addAddress()` | `` `0x${string}` ``       |

---

### useUserDecrypt

Hook for decrypting FHE encrypted values.

```tsx
import { useUserDecrypt } from "fhevm-sdk";

function MyComponent() {
  const {
    decrypt,
    results,
    canDecrypt,
    isDecrypting,
    message,
    error,
    clearError,
    isSuccess,
    isError,
    isIdle,
  } = useUserDecrypt({
    handle: balanceHandle,
    contractAddress,
  });
}
```

#### Parameters

**Single-handle (recommended):**

```tsx
useUserDecrypt({
  handle: string | undefined,
  contractAddress: `0x${string}` | undefined,
});
```

**Batch decryption:**

```tsx
useUserDecrypt(
  [
    { handle: handle1, contractAddress },
    { handle: handle2, contractAddress },
  ],
  signerOverride // optional
);
```

#### Returns

| Property       | Type                                    | Description                           |
| -------------- | --------------------------------------- | ------------------------------------- |
| `canDecrypt`   | `boolean`                               | Whether decryption can be called      |
| `decrypt`      | `() => void`                            | Trigger decryption                    |
| `results`      | `Record<string, string \| bigint \| boolean>` | Decrypted values by handle      |
| `isDecrypting` | `boolean`                               | Whether decryption is in progress     |
| `message`      | `string`                                | Status message for UI                 |
| `error`        | `string \| null`                        | Error message if failed               |
| `clearError`   | `() => void`                            | Clear error state                     |
| `isSuccess`    | `boolean`                               | Whether decryption succeeded          |
| `isError`      | `boolean`                               | Whether decryption failed             |
| `isIdle`       | `boolean`                               | Whether hook is idle                  |

---

### useFhevmStatus

Hook for checking FHEVM initialization status.

```tsx
import { useFhevmStatus } from "fhevm-sdk";

function MyComponent() {
  const {
    status,
    error,
    isReady,
    isInitializing,
    isError,
    chainId,
    isConnected,
  } = useFhevmStatus();

  if (isInitializing) return <p>Initializing FHEVM...</p>;
  if (isError) return <p>Error: {error?.message}</p>;
  if (!isReady) return <p>Connect wallet to continue</p>;

  return <p>Ready on chain {chainId}</p>;
}
```

#### Returns

| Property         | Type                  | Description                              |
| ---------------- | --------------------- | ---------------------------------------- |
| `status`         | `FhevmStatus`         | `'idle' \| 'initializing' \| 'ready' \| 'error'` |
| `error`          | `Error \| undefined`  | Error if initialization failed           |
| `isReady`        | `boolean`             | `status === 'ready'`                     |
| `isInitializing` | `boolean`             | `status === 'initializing'`              |
| `isError`        | `boolean`             | `status === 'error'`                     |
| `chainId`        | `number \| undefined` | Current chain ID                         |
| `isConnected`    | `boolean`             | Whether wallet is connected              |

---

### useFhevmClient

Hook for direct access to the FHEVM instance.

```tsx
import { useFhevmClient } from "fhevm-sdk";

function MyComponent() {
  const { instance, status, config, refresh, isReady } = useFhevmClient();

  // Use for advanced operations
  if (instance) {
    const input = instance.createEncryptedInput(contractAddress, userAddress);
  }
}
```

#### Returns

| Property   | Type                           | Description                   |
| ---------- | ------------------------------ | ----------------------------- |
| `instance` | `FhevmInstance \| undefined`   | FHEVM instance                |
| `status`   | `FhevmStatus`                  | Current status                |
| `config`   | `FhevmConfig`                  | Configuration object          |
| `refresh`  | `() => void`                   | Re-initialize instance        |
| `isReady`  | `boolean`                      | Whether instance is ready     |

---

### useEthersSigner

Hook to get an ethers.js signer from the connected wallet.

```tsx
import { useEthersSigner } from "fhevm-sdk";

function MyComponent() {
  const { signer, provider, isLoading, error, isReady } = useEthersSigner();

  if (isReady && signer) {
    // Use signer for signing operations
    const address = await signer.getAddress();
  }
}
```

#### Returns

| Property    | Type                                    | Description                      |
| ----------- | --------------------------------------- | -------------------------------- |
| `signer`    | `ethers.JsonRpcSigner \| undefined`     | Ethers signer                    |
| `provider`  | `ethers.BrowserProvider \| undefined`   | Ethers provider                  |
| `isLoading` | `boolean`                               | Whether signer is being created  |
| `error`     | `Error \| null`                         | Error if signer creation failed  |
| `isReady`   | `boolean`                               | Whether signer is ready          |

---

### useUserDecryptedValue

Hook for reading cached decrypted values without triggering new decryption.

```tsx
import { useUserDecryptedValue } from "fhevm-sdk";

function CachedBalance({ handle, contractAddress }) {
  const { data, isCached } = useUserDecryptedValue(handle, contractAddress);

  if (!isCached) {
    return <p>Value not decrypted yet</p>;
  }

  return <p>Cached balance: {data?.toString()}</p>;
}
```

#### Parameters

| Parameter         | Type                       | Description             |
| ----------------- | -------------------------- | ----------------------- |
| `handle`          | `string \| undefined`      | Encrypted handle        |
| `contractAddress` | `` `0x${string}` \| undefined `` | Contract address   |

#### Returns

| Property          | Type                                    | Description                    |
| ----------------- | --------------------------------------- | ------------------------------ |
| `data`            | `string \| bigint \| boolean \| undefined` | Cached decrypted value      |
| `isCached`        | `boolean`                               | Whether value is in cache      |
| `handle`          | `string \| undefined`                   | The queried handle             |
| `contractAddress` | `string \| undefined`                   | The queried contract address   |

---

### useUserDecryptedValues

Hook for reading multiple cached decrypted values at once.

```tsx
import { useUserDecryptedValues } from "fhevm-sdk";

function TokenBalances({ tokens }) {
  const { values, allCached, cachedCount } = useUserDecryptedValues(
    tokens.map((t) => ({ handle: t.handle, contractAddress: t.address }))
  );

  return (
    <ul>
      {tokens.map((token, i) => (
        <li key={token.handle}>
          {token.name}: {values[i]?.toString() ?? "Encrypted"}
        </li>
      ))}
    </ul>
  );
}
```

#### Returns

| Property      | Type                                          | Description                     |
| ------------- | --------------------------------------------- | ------------------------------- |
| `values`      | `(string \| bigint \| boolean \| undefined)[]` | Cached values in order         |
| `allCached`   | `boolean`                                     | Whether all values are cached   |
| `cachedCount` | `number`                                      | Number of cached values         |

---

## Types Reference

### Core Types

```tsx
// FHEVM initialization status
type FhevmStatus = "idle" | "initializing" | "ready" | "error";

// Encryption result
type EncryptedInput = {
  handles: Uint8Array[];
  inputProof: Uint8Array;
};

// Supported encryption types
type EncryptableType =
  | "bool"
  | "uint8"
  | "uint16"
  | "uint32"
  | "uint64"
  | "uint128"
  | "uint256"
  | "address";
```

### Decryption Types

```tsx
// Single decrypt request
interface DecryptRequest {
  handle: string;
  contractAddress: `0x${string}`;
}

// Simplified params for useUserDecrypt
interface DecryptParams {
  handle: string | undefined;
  contractAddress: `0x${string}` | undefined;
}
```

### Chain Types

```tsx
// Base chain configuration
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

### Storage Types

```tsx
// Storage interface (sync or async)
interface FhevmStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}
```

---

## Migration Guide

### From Legacy Hooks to New API

#### useFhevm → FhevmProvider + useFhevmClient

**Before (Legacy):**

```tsx
import { useFhevm } from "fhevm-sdk";

function MyComponent() {
  const { instance, status, error } = useFhevm(
    provider,
    chainId,
    true,
    initialMockChains
  );
}
```

**After (New API):**

```tsx
// In provider setup
<FhevmProvider config={config} wagmi={{ isConnected, chainId, address }}>
  {children}
</FhevmProvider>

// In component
import { useFhevmClient, useFhevmStatus } from "fhevm-sdk";

function MyComponent() {
  const { instance } = useFhevmClient();
  const { status, error } = useFhevmStatus();
}
```

#### useFHEEncryption → useEncrypt

**Before (Legacy):**

```tsx
import { useFHEEncryption } from "fhevm-sdk";

function MyComponent({ instance, ethersSigner, contractAddress }) {
  const { canEncrypt, encryptWith } = useFHEEncryption(
    instance,
    ethersSigner,
    contractAddress
  );

  const handleEncrypt = async () => {
    const encrypted = await encryptWith((builder) => {
      builder.add64(100n);
    });
  };
}
```

**After (New API):**

```tsx
import { useEncrypt } from "fhevm-sdk";

function MyComponent({ contractAddress }) {
  const { encrypt, isReady } = useEncrypt();

  const handleEncrypt = async () => {
    // Simple pattern - defaults to uint64
    const encrypted = await encrypt(100n, contractAddress);

    // Or with builder pattern
    const encrypted = await encryptWith(contractAddress, (builder) => {
      builder.add64(100n);
    });
  };
}
```

#### useFHEDecrypt → useUserDecrypt

**Before (Legacy):**

```tsx
import { useFHEDecrypt } from "fhevm-sdk";

function MyComponent({ instance, signer, storage, chainId }) {
  const { decrypt, results, canDecrypt, isDecrypting } = useFHEDecrypt(
    instance,
    signer,
    storage,
    chainId,
    [{ handle, contractAddress }]
  );
}
```

**After (New API):**

```tsx
import { useUserDecrypt } from "fhevm-sdk";

function MyComponent() {
  // Everything auto-detected from context!
  const { decrypt, results, canDecrypt, isDecrypting } = useUserDecrypt({
    handle,
    contractAddress,
  });
}
```

### Key Differences

| Aspect              | Legacy API                          | New API                            |
| ------------------- | ----------------------------------- | ---------------------------------- |
| Instance management | Manual via `useFhevm`               | Automatic via `FhevmProvider`      |
| Signer              | Manual prop passing                 | Auto-detected from `window.ethereum` |
| Storage             | Manual prop passing                 | Configured once in `createFhevmConfig` |
| Chain ID            | Manual prop passing                 | Auto-detected from wagmi           |
| Encryption          | Requires instance + signer props    | Just call `encrypt(value, contract)` |
| Decryption          | 5+ required parameters              | Just pass `{ handle, contractAddress }` |
| Caching             | Manual implementation               | Built-in TanStack Query caching    |

---

## Best Practices

1. **Always check `isReady` before operations** - Encryption and decryption require initialization.

2. **Use the simple API when possible** - `encrypt(value, contract)` is cleaner than the builder pattern for single values.

3. **Leverage caching** - Use `useUserDecryptedValue()` to check if a value is already decrypted before calling `decrypt()`.

4. **Handle errors gracefully** - Both encryption and decryption can fail. Always check for errors.

5. **Use TypeScript** - The SDK is fully typed. Let TypeScript guide you.

```tsx
// Good: Check isReady
const { encrypt, isReady } = useEncrypt();
if (!isReady) return <LoadingState />;

// Good: Check canDecrypt
const { decrypt, canDecrypt } = useUserDecrypt({ handle, contractAddress });
<button disabled={!canDecrypt} onClick={decrypt}>Decrypt</button>

// Good: Handle errors
const { error, isError } = useUserDecrypt({ handle, contractAddress });
if (isError) return <ErrorState message={error} />;
```
