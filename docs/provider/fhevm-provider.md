# FhevmProvider

The FhevmProvider component wraps your application to provide FHEVM context to all hooks.

## Features

- **Automatic script loading** - Loads the Zama Relayer SDK automatically (no manual script tag needed)
- **Auto-initialization** - Initializes FHEVM when wallet connects
- **Chain switching** - Reinitializes when chain changes
- **Error handling** - Exposes script and initialization errors via `useFhevmStatus`

## Basic Usage

```tsx
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
```

## Props

| Prop       | Type                                | Default           | Description                         |
| ---------- | ----------------------------------- | ----------------- | ----------------------------------- |
| `config`   | `FhevmConfig`                       | Required          | Config from `createFhevmConfig()`   |
| `children` | `ReactNode`                         | Required          | Child components                    |
| `wagmi`    | `{ isConnected, chainId, address }` | `undefined`       | Wagmi state for auto-initialization |
| `provider` | `EIP1193Provider`                   | `window.ethereum` | EIP-1193 provider                   |
| `autoInit` | `boolean`                           | `true`            | Auto-initialize when wallet connects |

## Provider Hierarchy

Place FhevmProvider after WagmiProvider and QueryClientProvider:

```tsx
<WagmiProvider config={wagmiConfig}>
  <QueryClientProvider client={queryClient}>
    <FhevmProvider config={fhevmConfig} wagmi={wagmiState}>
      <YourApp />
    </FhevmProvider>
  </QueryClientProvider>
</WagmiProvider>
```

## Wagmi Integration

The `wagmi` prop connects FhevmProvider to your wagmi state:

```tsx
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
```

When wagmi state changes:

- **Connect**: FHEVM instance initializes automatically
- **Disconnect**: Instance is cleared
- **Chain change**: Instance reinitializes for new chain

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

## Custom Provider

Use a custom EIP-1193 provider instead of `window.ethereum`:

```tsx
import { useWalletClient } from "wagmi";

function FhevmWrapper({ children }) {
  const { data: walletClient } = useWalletClient();

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={walletClient}
      wagmi={wagmiState}
    >
      {children}
    </FhevmProvider>
  );
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
  refresh: () => void;
}
```

Access context directly with `useFhevmContext`:

```tsx
import { useFhevmContext } from "fhevm-sdk";

function MyComponent() {
  const { instance, status, chainId } = useFhevmContext();
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
