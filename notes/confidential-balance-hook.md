# useConfidentialBalance Hook

## Goal

Create a `useConfidentialBalance` hook that fetches the encrypted balance handle from an ERC7984 contract **and optionally decrypts it**, structured similarly to wagmi's `useReadContract` hook.

## Status

- [x] Basic hook implemented (`handle`, `refetch`, `status`, `is*` booleans)
- [ ] Add built-in decrypt support (`decrypt: true` option)
- [ ] Add multi-balance support documentation / pattern

---

## Current Hook API (implemented)

```typescript
const {
  handle,              // bytes32 | undefined - the encrypted balance handle
  isLoading,           // boolean - initial loading
  isRefetching,        // boolean - refetching after initial load
  isFetching,          // boolean - isLoading || isRefetching
  isError,             // boolean
  isSuccess,           // boolean
  error,               // Error | null
  refetch,             // () => Promise<void>
  status,              // 'idle' | 'loading' | 'success' | 'error'
} = useConfidentialBalance({
  contractAddress: `0x${string}`,
  account?: `0x${string}`,         // Optional - defaults to connected wallet
  abi?: Abi,                       // Optional - uses ERC7984_ABI by default
  enabled?: boolean,               // Optional - default true
});
```

---

## Enhancement: Built-in Decrypt Option

### Motivation

Currently, decrypting a balance requires composing two hooks manually:

```tsx
const { handle } = useConfidentialBalance({ contractAddress });
const { decrypt, results } = useUserDecrypt({ handle, contractAddress });
```

With a `decrypt` option, the hook handles this internally:

```tsx
const {
  handle,
  value,          // bigint | undefined - the decrypted clear value
  decrypt,        // () => void - trigger decryption
  isDecrypting,   // boolean
  isDecrypted,    // boolean - value !== undefined
  canDecrypt,     // boolean
  // ...all existing fields
} = useConfidentialBalance({
  contractAddress: tokenAddress,
  account: address,
  decrypt: true,  // enable decrypt capability
});
```

### Updated Options Type

```typescript
export interface UseConfidentialBalanceOptions {
  contractAddress: `0x${string}`;
  account?: `0x${string}`;
  abi?: ethers.InterfaceAbi;
  enabled?: boolean;
  decrypt?: boolean;  // NEW - enable built-in decryption (default: false)
}
```

### Updated Return Type

```typescript
export interface UseConfidentialBalanceReturn {
  // --- Existing (balance handle) ---
  handle: `0x${string}` | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  status: BalanceStatus;

  // --- NEW (decryption) ---
  value: bigint | string | boolean | undefined;  // decrypted clear value
  decrypt: () => void;                            // trigger decryption manually
  isDecrypting: boolean;
  isDecrypted: boolean;                           // value !== undefined
  canDecrypt: boolean;
  decryptError: string | null;
}
```

### Internal Implementation

The hook composes `useUserDecrypt` internally when `decrypt: true`:

```
useConfidentialBalance({ decrypt: true })
        │
        ├── fetch handle via ethers (existing logic)
        │       ↓
        │   handle available?
        │       ↓ yes
        └── useUserDecrypt({ handle, contractAddress })
                ↓
            expose: decrypt(), value, isDecrypting, canDecrypt, decryptError
```

Key details:
- `useUserDecrypt` is always called (React rules of hooks), but with `undefined` params when `decrypt: false`
- When `decrypt: false`, all decrypt fields return idle/undefined values
- `value` is derived from `useUserDecrypt`'s `results[handle]`
- `isDecrypted` is `true` when `handle` exists AND `value !== undefined`
- When handle is `ethers.ZeroHash`, `value` is `BigInt(0)` without needing decryption

### Usage Example

```tsx
function BalanceDisplay({ tokenAddress }) {
  const { address } = useAccount();

  const {
    handle,
    value,
    isLoading,
    isDecrypted,
    isDecrypting,
    canDecrypt,
    decrypt,
    refetch,
  } = useConfidentialBalance({
    contractAddress: tokenAddress,
    account: address,
    decrypt: true,
  });

  if (isLoading) return <p>Loading...</p>;
  if (!handle) return <p>No balance</p>;

  return (
    <div>
      <p>Handle: {handle}</p>
      {isDecrypted
        ? <p>Balance: {value?.toString()}</p>
        : <button onClick={decrypt} disabled={!canDecrypt}>
            {isDecrypting ? "Decrypting..." : "Decrypt Balance"}
          </button>
      }
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

---

## Multi-Balance Pattern

### How It Works

`useConfidentialBalance` fetches **one** balance for **one** contract + account pair. This is intentional — it mirrors wagmi's `useReadContract` which also reads a single value.

For multiple balances (e.g. a portfolio of confidential tokens), there are two patterns:

### Pattern 1: Multiple Hook Calls (recommended for small N)

React hooks can be called multiple times as long as the call count is stable:

```tsx
function Portfolio({ tokens }: { tokens: `0x${string}`[] }) {
  // ⚠️ This only works if `tokens` array length is stable across renders.
  // If it changes, you need Pattern 2.
  const balances = tokens.map(token =>
    useConfidentialBalance({ contractAddress: token })
  );

  return (
    <ul>
      {balances.map((b, i) => (
        <li key={tokens[i]}>
          {tokens[i]}: {b.handle ?? "No balance"}
        </li>
      ))}
    </ul>
  );
}
```

**Limitation:** The array length must not change between renders (React rules of hooks). If the token list is dynamic, use Pattern 2.

### Pattern 2: Wrapper Component (recommended for dynamic lists)

Render a child component per token so each has its own stable hook call:

```tsx
function Portfolio({ tokens }: { tokens: `0x${string}`[] }) {
  return (
    <ul>
      {tokens.map(token => (
        <TokenBalance key={token} contractAddress={token} />
      ))}
    </ul>
  );
}

function TokenBalance({ contractAddress }: { contractAddress: `0x${string}` }) {
  const { handle, isLoading, value, decrypt, canDecrypt } = useConfidentialBalance({
    contractAddress,
    decrypt: true,
  });

  if (isLoading) return <li>Loading...</li>;
  return (
    <li>
      {contractAddress}: {value?.toString() ?? handle ?? "No balance"}
      {!value && canDecrypt && <button onClick={decrypt}>Decrypt</button>}
    </li>
  );
}
```

This is the standard React pattern for dynamic lists with hooks — one component per item.

### Pattern 3: Future `useConfidentialBalances` (batch hook)

A future batch hook could accept multiple contract addresses and return an array of results. This would use a single `ethers.Contract.multicall()` or sequential calls internally. Not implemented yet — Pattern 2 covers most use cases well.

---

## File Structure

```
fhevm-sdk/src/
├── types/
│   └── balance.ts                    # Balance hook types (options + return)
├── react/
│   └── useConfidentialBalance.ts     # Hook implementation (fetch + optional decrypt)
```

---

## Implementation Steps (for decrypt enhancement)

1. Update `src/types/balance.ts` — add `decrypt` to options, add decrypt fields to return type
2. Update `src/react/useConfidentialBalance.ts` — compose `useUserDecrypt` internally
3. Build SDK: `cd packages/fhevm-sdk && pnpm build`
4. Update `useERC7984Wagmi.tsx` to use the new `decrypt: true` option, removing the separate `useUserDecrypt` call
5. Type-check: `cd packages/erc7984example && pnpm check-types`
