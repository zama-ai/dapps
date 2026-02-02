# useConfidentialBalances

Hook for reading confidential ERC7984 balance handles, with optional auto-decryption.

It follows a wagmi-style `useReadContracts` pattern: you pass an array of contract configs and get per-item results.

## Import

```tsx
import { useConfidentialBalances } from "fhevm-sdk";
```

## Usage

### Fetch handles for multiple contracts

```tsx
const { data, isLoading, refetch } = useConfidentialBalances({
  contracts: [
    { contractAddress: tokenA },
    { contractAddress: tokenB },
  ],
});

// data[0].result -> bytes32 handle for tokenA
// data[1].result -> bytes32 handle for tokenB
```

### Auto-decrypt balances

```tsx
const {
  data,
  decryptAll,
  isDecrypting,
  isAllDecrypted,
} = useConfidentialBalances({
  contracts: [{ contractAddress: tokenA }],
  decrypt: true,
});

// Trigger decryption (will request a signature if needed)
const handleDecrypt = () => decryptAll();

// data[0].decryptedValue -> cleartext balance once decrypted
```

## Options

| Option | Type | Description |
| --- | --- | --- |
| `contracts` | `ConfidentialBalanceConfig[]` | Array of contract configs. |
| `account` | `` `0x${string}` `` | Optional default account (overridden by per-contract `account`). |
| `enabled` | `boolean` | Enable/disable fetching (default: `true`). |
| `decrypt` | `boolean` | If `true`, enable auto-decryption helpers. |

### ConfidentialBalanceConfig

```tsx
type ConfidentialBalanceConfig = {
  contractAddress: `0x${string}`;
  account?: `0x${string}`;
  abi?: ethers.InterfaceAbi;
};
```

## Returns

| Property | Type | Description |
| --- | --- | --- |
| `data` | `ConfidentialBalanceResult[]` | Per-contract results and decrypted values (if available). |
| `isLoading` | `boolean` | True while the first fetch is running. |
| `isRefetching` | `boolean` | True while refetching. |
| `isFetching` | `boolean` | True while any fetch is in progress. |
| `isError` | `boolean` | True if any request failed. |
| `isSuccess` | `boolean` | True when all requests succeeded. |
| `error` | `Error \| null` | First error encountered, if any. |
| `refetch` | `() => Promise<void>` | Re-run the balance reads. |
| `status` | `"idle" \| "loading" \| "success" \| "error"` | Overall status. |
| `decryptAll` | `() => void` | Trigger decryption for fetched handles. |
| `isDecrypting` | `boolean` | True while decryption is running. |
| `canDecrypt` | `boolean` | Whether decryption can be triggered. |
| `decryptError` | `string \| null` | Decryption error message, if any. |
| `isAllDecrypted` | `boolean` | True if all fetched handles are decrypted. |
| `decryptedCount` | `number` | Number of handles decrypted. |

### ConfidentialBalanceResult

```tsx
type ConfidentialBalanceResult = {
  result: `0x${string}` | undefined;
  status: "success" | "failure" | "pending";
  error: Error | undefined;
  decryptedValue?: string | bigint | boolean;
};
```

## Notes

- When `decrypt: true`, the hook will attempt auto-decryption if a cached EIP-712 signature exists, otherwise `decryptAll()` will prompt the wallet.
- A `result` of `undefined` typically indicates a zero handle (`0x00...`) from the contract.
