# useFhevmStatus

Hook for checking FHEVM initialization status.

## Import

```tsx
import { useFhevmStatus } from "fhevm-sdk";
```

## Usage

```tsx
function FHEStatus() {
  const { status, isReady, isInitializing, isError, error } = useFhevmStatus();

  if (isInitializing) return <p>Initializing FHE...</p>;
  if (isError) return <p>Error: {error?.message}</p>;
  if (!isReady) return <p>Connect wallet</p>;

  return <p>FHE Ready!</p>;
}
```

## Returns

| Property         | Type                  | Description                                        |
| ---------------- | --------------------- | -------------------------------------------------- |
| `status`         | `FhevmStatus`         | `'idle' \| 'initializing' \| 'ready' \| 'error'`   |
| `error`          | `Error \| undefined`  | Error if initialization failed                     |
| `isReady`        | `boolean`             | `status === 'ready'`                               |
| `isInitializing` | `boolean`             | `status === 'initializing'`                        |
| `isError`        | `boolean`             | `status === 'error'`                               |
| `chainId`        | `number \| undefined` | Current chain ID                                   |
| `isConnected`    | `boolean`             | Whether wallet is connected                        |

## Status Values

| Status         | Description                              |
| -------------- | ---------------------------------------- |
| `'idle'`       | Not started, waiting for wallet connect  |
| `'initializing'` | FHEVM instance is being created        |
| `'ready'`      | Instance ready, can encrypt/decrypt      |
| `'error'`      | Initialization failed                    |

## Examples

### Loading State

```tsx
function App() {
  const { isReady, isInitializing } = useFhevmStatus();

  if (isInitializing) {
    return <LoadingSpinner />;
  }

  if (!isReady) {
    return <ConnectWalletPrompt />;
  }

  return <MainApp />;
}
```

### Error Handling

```tsx
function FHEError() {
  const { isError, error } = useFhevmStatus();

  if (!isError) return null;

  return (
    <div className="error-banner">
      <p>FHE initialization failed: {error?.message}</p>
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
}
```

### Conditional Features

```tsx
function EncryptedFeature() {
  const { isReady } = useFhevmStatus();

  if (!isReady) {
    return (
      <div className="disabled">
        <p>FHE features require wallet connection</p>
      </div>
    );
  }

  return <EncryptedContent />;
}
```

### Status Badge

```tsx
function StatusBadge() {
  const { status, chainId } = useFhevmStatus();

  const colors = {
    idle: "gray",
    initializing: "yellow",
    ready: "green",
    error: "red",
  };

  return (
    <span style={{ color: colors[status] }}>
      FHE: {status} {chainId && `(Chain ${chainId})`}
    </span>
  );
}
```

## When to Use

Use `useFhevmStatus` for:

- Showing loading states during initialization
- Disabling features until FHE is ready
- Displaying error messages
- Conditional rendering based on FHE availability

For accessing the FHEVM instance directly, use [useFhevmClient](use-fhevm-client.md) instead.
