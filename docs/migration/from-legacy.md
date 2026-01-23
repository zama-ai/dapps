# Migration Guide

This guide helps you migrate from the legacy fhevm-sdk API to the new wagmi-style API.

## Overview

The new API provides:

- **Simpler hooks** - Less boilerplate, auto-detection of signers
- **Provider pattern** - Wagmi-style configuration and context
- **TanStack Query integration** - Built-in caching and state management
- **Better TypeScript support** - Improved type inference

## Quick Comparison

| Aspect              | Legacy API                         | New API                              |
| ------------------- | ---------------------------------- | ------------------------------------ |
| Instance management | Manual via `useFhevm`              | Automatic via `FhevmProvider`        |
| Signer              | Manual prop passing                | Auto-detected from `window.ethereum` |
| Storage             | Manual prop passing                | Configured once in config            |
| Chain ID            | Manual prop passing                | Auto-detected from wagmi             |
| Encryption          | Requires instance + signer props   | Just call `encrypt(value, contract)` |
| Decryption          | 5+ required parameters             | Just pass `{ handle, contractAddress }` |
| Caching             | Manual implementation              | Built-in TanStack Query caching      |

## Migration Steps

### 1. Update Configuration

**Before:**

```tsx
// No centralized config
const mockChains = [31337];
```

**After:**

```tsx
import { createFhevmConfig, sepolia, hardhatLocal } from "fhevm-sdk";

const fhevmConfig = createFhevmConfig({
  chains: [sepolia, hardhatLocal],
});
```

### 2. Add FhevmProvider

**Before:**

```tsx
// No provider, manual instance management in components
function App({ children }) {
  return <WagmiProvider>{children}</WagmiProvider>;
}
```

**After:**

```tsx
import { FhevmProvider } from "fhevm-sdk";
import { useAccount } from "wagmi";

function FhevmWrapper({ children }) {
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

function App({ children }) {
  return (
    <WagmiProvider>
      <QueryClientProvider client={queryClient}>
        <FhevmWrapper>{children}</FhevmWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 3. Migrate useFhevm → useFhevmClient

**Before:**

```tsx
import { useFhevm } from "fhevm-sdk";

function MyComponent() {
  const { instance, status, error } = useFhevm(
    provider,
    chainId,
    true, // enabled
    [31337] // mockChains
  );

  if (status === "loading") return <Loading />;
  if (status === "error") return <Error message={error} />;
}
```

**After:**

```tsx
import { useFhevmClient, useFhevmStatus } from "fhevm-sdk";

function MyComponent() {
  const { instance } = useFhevmClient();
  const { status, error, isInitializing, isError } = useFhevmStatus();

  if (isInitializing) return <Loading />;
  if (isError) return <Error message={error?.message} />;
}
```

### 4. Migrate useFHEEncryption → useEncrypt

**Before:**

```tsx
import { useFHEEncryption } from "fhevm-sdk";

function TransferForm({ instance, ethersSigner, contractAddress }) {
  const { canEncrypt, encryptWith } = useFHEEncryption(
    instance,
    ethersSigner,
    contractAddress
  );

  const handleEncrypt = async () => {
    if (!canEncrypt) return;

    const encrypted = await encryptWith((builder) => {
      builder.add64(100n);
    });
  };
}
```

**After:**

```tsx
import { useEncrypt } from "fhevm-sdk";

function TransferForm({ contractAddress }) {
  const { encrypt, isReady } = useEncrypt();

  const handleEncrypt = async () => {
    if (!isReady) return;

    // Simple pattern - no builder needed for single values
    const encrypted = await encrypt(100n, contractAddress);

    // Or with builder for complex cases
    const encrypted = await encryptWith(contractAddress, (builder) => {
      builder.add64(100n);
    });
  };
}
```

### 5. Migrate useFHEDecrypt → useUserDecrypt

**Before:**

```tsx
import { useFHEDecrypt } from "fhevm-sdk";

function BalanceDisplay({
  instance,
  ethersSigner,
  storage,
  chainId,
  handle,
  contractAddress,
}) {
  const { decrypt, results, canDecrypt, isDecrypting, error } = useFHEDecrypt(
    instance,
    ethersSigner,
    storage,
    chainId,
    [{ handle, contractAddress }]
  );

  return (
    <div>
      <p>{results[handle]?.toString() ?? "Encrypted"}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        {isDecrypting ? "..." : "Decrypt"}
      </button>
    </div>
  );
}
```

**After:**

```tsx
import { useUserDecrypt } from "fhevm-sdk";

function BalanceDisplay({ handle, contractAddress }) {
  // Everything auto-detected from context!
  const { decrypt, results, canDecrypt, isDecrypting, error } = useUserDecrypt({
    handle,
    contractAddress,
  });

  return (
    <div>
      <p>{results[handle]?.toString() ?? "Encrypted"}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        {isDecrypting ? "..." : "Decrypt"}
      </button>
    </div>
  );
}
```

### 6. Migrate useInMemoryStorage

**Before:**

```tsx
import { useInMemoryStorage } from "fhevm-sdk";

function App() {
  const storage = useInMemoryStorage();

  return <MyComponent storage={storage} />;
}
```

**After:**

```tsx
import { createFhevmConfig, createMemoryStorage } from "fhevm-sdk";

// Configure once at app level
const config = createFhevmConfig({
  chains: [sepolia],
  storage: createMemoryStorage(), // or createStorage() for localStorage
});

// No need to pass storage to components
function App() {
  return (
    <FhevmProvider config={config}>
      <MyComponent /> {/* No storage prop needed */}
    </FhevmProvider>
  );
}
```

## Removed Props

These props are no longer needed in components:

| Removed Prop    | New Location                    |
| --------------- | ------------------------------- |
| `instance`      | Auto-managed by FhevmProvider   |
| `ethersSigner`  | Auto-detected from window.ethereum |
| `storage`       | Configured in createFhevmConfig |
| `chainId`       | Read from wagmi via FhevmProvider |
| `provider`      | Configured in FhevmProvider     |
| `mockChains`    | Configured in createFhevmConfig |

## Legacy Hooks Still Available

For gradual migration, legacy hooks are still exported:

```tsx
// These still work but are deprecated
import {
  useFhevm,
  useFHEEncryption,
  useFHEDecrypt,
  useInMemoryStorage,
} from "fhevm-sdk";
```

We recommend migrating to the new API for better DX and future compatibility.

## Complete Example

### Before (Legacy)

```tsx
function TokenBalance({ contractAddress, handle }) {
  const { chain } = useAccount();
  const chainId = chain?.id;

  // Manual instance management
  const { instance, status } = useFhevm(
    (window as any).ethereum,
    chainId,
    true,
    [31337]
  );

  // Manual signer
  const [signer, setSigner] = useState();
  useEffect(() => {
    // ... signer setup
  }, []);

  // Manual storage
  const storage = useInMemoryStorage();

  // Decryption with many props
  const { decrypt, results, canDecrypt } = useFHEDecrypt(
    instance,
    signer,
    storage,
    chainId,
    [{ handle, contractAddress }]
  );

  if (status !== "ready") return <Loading />;

  return (
    <div>
      <p>{results[handle]?.toString()}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        Decrypt
      </button>
    </div>
  );
}
```

### After (New API)

```tsx
function TokenBalance({ contractAddress, handle }) {
  const { isReady } = useFhevmStatus();

  // Everything auto-detected!
  const { decrypt, results, canDecrypt } = useUserDecrypt({
    handle,
    contractAddress,
  });

  if (!isReady) return <Loading />;

  return (
    <div>
      <p>{results[handle]?.toString()}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        Decrypt
      </button>
    </div>
  );
}
```

Lines of code: **~40 → ~15** (62% reduction)
