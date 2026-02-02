# FhevmProvider

The FhevmProvider component wraps your application to provide FHEVM context to all hooks.

## Features

- **Automatic script loading** - Loads the Zama Relayer SDK automatically (no manual script tag needed)
- **Auto-initialization** - Initializes FHEVM when wallet connects
- **Chain switching** - Reinitializes when chain changes
- **Error handling** - Exposes script and initialization errors via `useFhevmStatus`
- **Library agnostic** - Works with wagmi, viem, ethers, or raw `window.ethereum`

## Basic Usage

```tsx
import { FhevmProvider, memoryStorage } from "fhevm-sdk";
import { useAccount, useConnectorClient } from "wagmi";

function FhevmWrapper({ children }) {
  const { address, chainId, isConnected } = useAccount();
  const { data: connectorClient } = useConnectorClient();

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={connectorClient?.transport ?? window.ethereum}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage}
    >
      {children}
    </FhevmProvider>
  );
}
```

## Props

| Prop          | Type                  | Default           | Description                                      |
| ------------- | --------------------- | ----------------- | ------------------------------------------------ |
| `config`      | `FhevmConfig`         | Required          | Config from `createFhevmConfig()`                |
| `children`    | `ReactNode`           | Required          | Child components                                 |
| `provider`    | `Eip1193Provider`     | `window.ethereum` | EIP-1193 provider (wallet)                       |
| `address`     | `` `0x${string}` ``   | `undefined`       | Connected wallet address                         |
| `chainId`     | `number`              | `undefined`       | Current chain ID                                 |
| `isConnected` | `boolean`             | `false`           | Whether wallet is connected                      |
| `storage`     | `GenericStringStorage`| `undefined`       | Storage for caching decryption signatures        |
| `autoInit`    | `boolean`             | `true`            | Auto-initialize when wallet connects             |

### Deprecated Props

| Prop    | Type                                | Description                                |
| ------- | ----------------------------------- | ------------------------------------------ |
| `wagmi` | `{ isConnected, chainId, address }` | **Deprecated.** Use explicit props instead |

## Storage Options

The `storage` prop controls how decryption signatures are cached. **No default is provided** - you must explicitly choose:

```tsx
import {
  memoryStorage,        // Cleared on page refresh (most secure)
  localStorageAdapter,  // Persistent in localStorage
  sessionStorageAdapter,// Cleared when tab closes
  noOpStorage,          // No caching, re-sign every time
} from "fhevm-sdk";

// Most secure - keys cleared on refresh
<FhevmProvider storage={memoryStorage} ... />

// Persistent - better UX, less secure
<FhevmProvider storage={localStorageAdapter} ... />

// No caching - re-sign every decrypt
<FhevmProvider storage={undefined} ... />
```

See [Storage Configuration](../configuration/storage.md) for details.

## Provider Hierarchy

Place FhevmProvider after WagmiProvider and QueryClientProvider:

```tsx
<WagmiProvider config={wagmiConfig}>
  <QueryClientProvider client={queryClient}>
    <FhevmProvider config={fhevmConfig} ...>
      <YourApp />
    </FhevmProvider>
  </QueryClientProvider>
</WagmiProvider>
```

## Integration Examples

### With wagmi

```tsx
import { useAccount, useConnectorClient } from "wagmi";
import { FhevmProvider, memoryStorage } from "fhevm-sdk";

function FhevmWrapper({ children }) {
  const { address, chainId, isConnected } = useAccount();
  const { data: connectorClient } = useConnectorClient();

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={connectorClient?.transport}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage}
    >
      {children}
    </FhevmProvider>
  );
}
```

### With viem only

```tsx
import { FhevmProvider, memoryStorage } from "fhevm-sdk";
import { useWallet } from "./useWallet"; // Custom hook

function App() {
  const { address, chainId, isConnected } = useWallet();

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={window.ethereum}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage}
    >
      <YourApp />
    </FhevmProvider>
  );
}
```

### With ethers only

```tsx
import { FhevmProvider, memoryStorage } from "fhevm-sdk";
import { useWallet } from "./useWallet"; // Custom hook using ethers

function App() {
  const { address, chainId, isConnected } = useWallet();

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={window.ethereum}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage}
    >
      <YourApp />
    </FhevmProvider>
  );
}
```

## Manual Initialization

Disable auto-initialization for manual control:

```tsx
import { useFhevmClient } from "fhevm-sdk";

function App() {
  return (
    <FhevmProvider config={fhevmConfig} autoInit={false}>
      <ManualInit />
    </FhevmProvider>
  );
}

function ManualInit() {
  const { refresh } = useFhevmClient();

  return <button onClick={refresh}>Initialize FHEVM</button>;
}
```

## Context Value

FhevmProvider exposes these values via context:

```tsx
interface FhevmContextValue {
  config: FhevmConfig;
  instance: FhevmInstance | undefined;
  status: FhevmStatus; // 'idle' | 'initializing' | 'ready' | 'error'
  error: Error | undefined;
  chainId: number | undefined;
  address: `0x${string}` | undefined;
  isConnected: boolean;
  provider: Eip1193Provider | undefined;
  storage: GenericStringStorage | undefined;
  refresh: () => void;
}
```

Access context directly with `useFhevmContext`:

```tsx
import { useFhevmContext } from "fhevm-sdk";

function MyComponent() {
  const { instance, status, chainId, provider } = useFhevmContext();
}
```

## Automatic Script Loading

FhevmProvider automatically loads the Zama Relayer SDK script from CDN. You don't need to add any script tags to your HTML or layout.

The provider handles:
- Loading the script on first mount
- Deduplication (won't load twice if multiple providers exist)
- Error states if the script fails to load

The script version is locked internally and managed by the SDK.

## Error Handling

Handle initialization errors (including script loading failures):

```tsx
import { useFhevmStatus } from "fhevm-sdk";

function FHEStatus() {
  const { status, error, isError } = useFhevmStatus();

  if (isError) {
    return (
      <div>
        <p>Failed to initialize FHE: {error?.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return null;
}
```

## Migration from wagmi prop

If you were using the deprecated `wagmi` prop, update to explicit props:

```tsx
// Before (deprecated)
<FhevmProvider
  config={fhevmConfig}
  wagmi={{ isConnected, chainId, address }}
>

// After (recommended)
<FhevmProvider
  config={fhevmConfig}
  provider={window.ethereum}
  address={address}
  chainId={chainId}
  isConnected={isConnected}
  storage={memoryStorage}
>
```
