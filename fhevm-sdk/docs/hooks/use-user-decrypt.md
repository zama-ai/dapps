# useUserDecrypt

Hook for decrypting FHE encrypted values.

## Import

```tsx
import { useUserDecrypt } from "fhevm-sdk";
```

## Usage

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

## Parameters

### Single Handle

```tsx
useUserDecrypt({
  handle: string | undefined,
  contractAddress: `0x${string}` | undefined,
});
```

### Batch Decryption

```tsx
useUserDecrypt(
  [
    { handle: handle1, contractAddress },
    { handle: handle2, contractAddress },
  ],
  signerOverride // optional ethers.JsonRpcSigner
);
```

## Returns

| Property       | Type                                          | Description                     |
| -------------- | --------------------------------------------- | ------------------------------- |
| `canDecrypt`   | `boolean`                                     | Whether decryption can be called |
| `decrypt`      | `() => void`                                  | Trigger decryption              |
| `results`      | `Record<string, string \| bigint \| boolean>` | Decrypted values by handle      |
| `isDecrypting` | `boolean`                                     | Whether in progress             |
| `message`      | `string`                                      | Status message for UI           |
| `error`        | `string \| null`                              | Error message if failed         |
| `clearError`   | `() => void`                                  | Clear error state               |
| `isSuccess`    | `boolean`                                     | Whether succeeded               |
| `isError`      | `boolean`                                     | Whether failed                  |
| `isIdle`       | `boolean`                                     | Whether not started             |

## How It Works

1. **Signature Management**: Automatically loads or creates a decryption signature
2. **User Signs Once**: Signature is cached in storage for future decryptions
3. **Batch Support**: Multiple handles can be decrypted in one operation
4. **Result Caching**: Results are cached in TanStack Query for fast lookups

## Examples

### Basic Decryption

```tsx
function Balance({ handle, contractAddress }) {
  const { decrypt, results, canDecrypt, isDecrypting } = useUserDecrypt({
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

### With Error Handling

```tsx
function Balance({ handle, contractAddress }) {
  const { decrypt, results, canDecrypt, isDecrypting, error, clearError } =
    useUserDecrypt({ handle, contractAddress });

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={clearError}>Dismiss</button>
      </div>
    );
  }

  return (
    <button onClick={decrypt} disabled={!canDecrypt}>
      {isDecrypting ? "Decrypting..." : "Decrypt"}
    </button>
  );
}
```

### Batch Decryption

```tsx
function TokenBalances({ tokens, contractAddress }) {
  const requests = tokens.map((t) => ({
    handle: t.balanceHandle,
    contractAddress,
  }));

  const { decrypt, results, canDecrypt, isDecrypting } =
    useUserDecrypt(requests);

  return (
    <div>
      {tokens.map((token) => (
        <p key={token.id}>
          {token.name}: {results[token.balanceHandle]?.toString() ?? "?"}
        </p>
      ))}
      <button onClick={decrypt} disabled={!canDecrypt}>
        {isDecrypting ? "Decrypting..." : "Decrypt All"}
      </button>
    </div>
  );
}
```

### Conditional Decryption

Only set up decryption when needed:

```tsx
function Balance({ handle, contractAddress }) {
  const [showDecrypted, setShowDecrypted] = useState(false);

  // Only pass params when we want to decrypt
  const { decrypt, results, canDecrypt } = useUserDecrypt(
    showDecrypted ? { handle, contractAddress } : undefined
  );

  if (!showDecrypted) {
    return <button onClick={() => setShowDecrypted(true)}>Show Balance</button>;
  }

  return (
    <div>
      <p>{results[handle]?.toString() ?? "Loading..."}</p>
      {canDecrypt && <button onClick={decrypt}>Refresh</button>}
    </div>
  );
}
```

## canDecrypt Conditions

`canDecrypt` is `true` when:

- FHEVM status is `'ready'`
- Instance is initialized
- Signer is available (auto-detected or provided)
- At least one valid request exists
- Not currently decrypting

## Signer Override

Provide a custom signer instead of auto-detection:

```tsx
import { useEthersSigner } from "fhevm-sdk";

function Balance({ handle, contractAddress }) {
  const { signer } = useEthersSigner();

  const { decrypt, results } = useUserDecrypt(
    [{ handle, contractAddress }],
    signer // explicit signer
  );
}
```

## Result Types

Decrypted values can be:

- `string` - For addresses
- `bigint` - For uint types
- `boolean` - For bool type
