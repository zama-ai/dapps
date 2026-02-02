# useUserDecryptedValue

Hook for reading cached decrypted values without triggering new decryption.

## Import

```tsx
import { useUserDecryptedValue, useUserDecryptedValues } from "fhevm-sdk";
```

## useUserDecryptedValue

Read a single cached value.

### Usage

```tsx
function CachedBalance({ handle, contractAddress }) {
  const { data, isCached } = useUserDecryptedValue(handle, contractAddress);

  if (!isCached) {
    return <p>Value not decrypted yet</p>;
  }

  return <p>Balance: {data?.toString()}</p>;
}
```

### Parameters

| Parameter         | Type                            | Description      |
| ----------------- | ------------------------------- | ---------------- |
| `handle`          | `string \| undefined`           | Encrypted handle |
| `contractAddress` | `` `0x${string}` \| undefined `` | Contract address |

### Returns

| Property          | Type                                       | Description                  |
| ----------------- | ------------------------------------------ | ---------------------------- |
| `data`            | `string \| bigint \| boolean \| undefined` | Cached decrypted value       |
| `isCached`        | `boolean`                                  | Whether value is in cache    |
| `handle`          | `string \| undefined`                      | The queried handle           |
| `contractAddress` | `string \| undefined`                      | The queried contract address |

## useUserDecryptedValues

Read multiple cached values at once.

### Usage

```tsx
function TokenBalances({ tokens }) {
  const { values, allCached, cachedCount } = useUserDecryptedValues(
    tokens.map((t) => ({ handle: t.handle, contractAddress: t.address }))
  );

  return (
    <div>
      <p>
        Cached: {cachedCount}/{tokens.length}
      </p>
      <ul>
        {tokens.map((token, i) => (
          <li key={token.handle}>
            {token.name}: {values[i]?.toString() ?? "Encrypted"}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Parameters

| Parameter | Type                                                              | Description         |
| --------- | ----------------------------------------------------------------- | ------------------- |
| `handles` | `readonly { handle: string; contractAddress: \`0x\${string}\` }[]` | Array of handles   |

### Returns

| Property      | Type                                            | Description                   |
| ------------- | ----------------------------------------------- | ----------------------------- |
| `values`      | `(string \| bigint \| boolean \| undefined)[]`  | Cached values in order        |
| `allCached`   | `boolean`                                       | Whether all values are cached |
| `cachedCount` | `number`                                        | Number of cached values       |

## Use Cases

### Check Before Decrypting

Avoid redundant decryption:

```tsx
function SmartBalance({ handle, contractAddress }) {
  const { isCached, data } = useUserDecryptedValue(handle, contractAddress);

  // Only set up decryption if not cached
  const { decrypt, canDecrypt, isDecrypting } = useUserDecrypt(
    !isCached ? { handle, contractAddress } : undefined
  );

  if (isCached) {
    return <p>Balance: {data?.toString()}</p>;
  }

  return (
    <div>
      <p>Balance: Encrypted</p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        {isDecrypting ? "Decrypting..." : "Decrypt"}
      </button>
    </div>
  );
}
```

### Display Previously Decrypted Values

```tsx
function HistoricalBalance({ handle, contractAddress }) {
  const { data, isCached } = useUserDecryptedValue(handle, contractAddress);

  return (
    <div>
      <p>
        Last known balance: {isCached ? data?.toString() : "Never decrypted"}
      </p>
    </div>
  );
}
```

### Batch Status Check

```tsx
function DecryptionStatus({ handles }) {
  const { allCached, cachedCount } = useUserDecryptedValues(handles);

  if (allCached) {
    return <span className="badge green">All decrypted</span>;
  }

  return (
    <span className="badge yellow">
      {cachedCount}/{handles.length} decrypted
    </span>
  );
}
```

## How Caching Works

1. When `useUserDecrypt` successfully decrypts a value, it caches the result
2. Cache uses TanStack Query's query client
3. Cache keys are based on `(chainId, handle, contractAddress)`
4. Cache persists for the session (or until invalidated)

## Cache Key Structure

```tsx
// Single value cache key
fhevmKeys.decryptHandle(chainId, handle, contractAddress);
// ["fhevm", "decrypt", chainId, handle, contractAddress]
```

## Important Notes

- These hooks are **read-only** - they don't trigger decryption
- To decrypt, use [useUserDecrypt](use-user-decrypt.md)
- Cache is per-session (cleared on page refresh)
- Different chains have separate caches
