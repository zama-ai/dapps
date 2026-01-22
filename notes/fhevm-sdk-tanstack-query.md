# fhevm-sdk TanStack Query Integration Plan

## Goal
Integrate TanStack Query (React Query) into fhevm-sdk to replace manual async state management with declarative queries and mutations. This provides better caching, loading states, error handling, and request deduplication.

## Current Pain Points

1. **Manual loading/error state management** in useDecrypt:
```typescript
const [isDecrypting, setIsDecrypting] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState<string | null>(null);
const [results, setResults] = useState<Record<string, bigint>>({});
```

2. **Manual staleness detection** via refs:
```typescript
const decryptRef = useRef({ isRunning: false, requestsKey: "" });
// Check if chainId, signer, or requests changed during async operation
```

3. **No request deduplication** - Same decryption request can be triggered multiple times

4. **No built-in caching** - Decrypted values aren't cached between component mounts

---

## Implementation Phases

### Phase 1: Add TanStack Query Dependency & Provider Setup

**Files to modify:**
- `packages/fhevm-sdk/package.json` - Add @tanstack/react-query peer dependency
- `packages/fhevm-sdk/src/react/FhevmProvider.tsx` - Add QueryClientProvider

**Changes:**

1. Add peer dependency (optional, since consumer likely already has it):
```json
{
  "peerDependencies": {
    "@tanstack/react-query": ">=5.0.0"
  },
  "peerDependenciesMeta": {
    "@tanstack/react-query": {
      "optional": true
    }
  }
}
```

2. Create internal QueryClient for SDK-specific queries:
```typescript
// src/react/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const fhevmQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000,   // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

3. Wrap FhevmProvider children with QueryClientProvider:
```typescript
// FhevmProvider.tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { fhevmQueryClient } from "./queryClient";

// In render:
<FhevmContext.Provider value={contextValue}>
  <QueryClientProvider client={fhevmQueryClient}>
    <InMemoryStorageProvider>
      {children}
    </InMemoryStorageProvider>
  </QueryClientProvider>
</FhevmContext.Provider>
```

**Commit message:** `feat(sdk): add TanStack Query provider setup`

---

### Phase 2: Create Query Key Factory

**Files to create:**
- `src/react/queryKeys.ts` - Centralized query key management

**Query Key Structure:**
```typescript
export const fhevmKeys = {
  all: ["fhevm"] as const,

  // Decryption queries
  decrypt: () => [...fhevmKeys.all, "decrypt"] as const,
  decryptHandle: (chainId: number, handle: string, contractAddress: string) =>
    [...fhevmKeys.decrypt(), chainId, handle, contractAddress] as const,

  // Signature queries
  signature: () => [...fhevmKeys.all, "signature"] as const,
  signatureFor: (chainId: number, address: string) =>
    [...fhevmKeys.signature(), chainId, address] as const,

  // Encryption (mutations, but keys useful for invalidation)
  encrypt: () => [...fhevmKeys.all, "encrypt"] as const,
};
```

**Commit message:** `feat(sdk): add query key factory for TanStack Query`

---

### Phase 3: Refactor useDecrypt with useMutation

**Files to modify:**
- `src/react/useDecrypt.ts` - Replace manual state with useMutation

**Current signature:**
```typescript
function useDecrypt(params: {
  requests: DecryptRequest[] | undefined;
}): {
  canDecrypt: boolean;
  decrypt: () => Promise<void>;
  isDecrypting: boolean;
  message: string;
  results: Record<string, bigint>;
  error: string | null;
  clearError: () => void;
}
```

**New implementation using useMutation:**
```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useDecrypt(params: { requests: DecryptRequest[] | undefined }): UseDecryptReturn {
  const { instance, status, chainId, address } = useFhevmContext();
  const { storage } = useInMemoryStorage();
  const queryClient = useQueryClient();

  // Get signer from window.ethereum
  const signer = useSigner();

  const mutation = useMutation({
    mutationKey: fhevmKeys.decrypt(),
    mutationFn: async (requests: DecryptRequest[]) => {
      if (!instance || !signer || !chainId) {
        throw new Error("FHEVM not ready");
      }

      // Load or create signature
      const signature = await FhevmDecryptionSignature.loadOrSign({
        chainId,
        address: address!,
        signer,
        instance,
        storage,
      });

      // Decrypt all handles
      const results: Record<string, bigint> = {};
      for (const request of requests) {
        const clear = await instance.userDecrypt(
          request.handle,
          request.contractAddress,
          signature
        );
        results[request.handle] = clear;

        // Cache individual result
        queryClient.setQueryData(
          fhevmKeys.decryptHandle(chainId, request.handle, request.contractAddress),
          clear
        );
      }

      return results;
    },
    onError: (error) => {
      console.error("[useDecrypt] Decryption failed:", error);
    },
  });

  const canDecrypt = useMemo(() =>
    status === "ready" &&
    instance !== undefined &&
    signer !== undefined &&
    params.requests !== undefined &&
    params.requests.length > 0 &&
    !mutation.isPending,
    [status, instance, signer, params.requests, mutation.isPending]
  );

  const decrypt = useCallback(() => {
    if (!canDecrypt || !params.requests) return;
    mutation.mutate(params.requests);
  }, [canDecrypt, params.requests, mutation]);

  return {
    canDecrypt,
    decrypt,
    isDecrypting: mutation.isPending,
    results: mutation.data ?? {},
    error: mutation.error?.message ?? null,
    clearError: mutation.reset,
    // TanStack Query additions
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
```

**Benefits:**
- Automatic loading/error state via `isPending`, `isError`
- Built-in request deduplication
- Automatic cleanup on unmount
- Can use `mutation.reset()` to clear error
- Results cached in queryClient

**Commit message:** `refactor(sdk): migrate useDecrypt to useMutation`

---

### Phase 4: Add useDecryptedValue Query Hook

**Files to create:**
- `src/react/useDecryptedValue.ts` - Query for individual decrypted values

**Purpose:** Allow querying cached decrypted values without triggering new decryption.

```typescript
import { useQuery } from "@tanstack/react-query";

export function useDecryptedValue(params: {
  handle: string | undefined;
  contractAddress: string | undefined;
}): {
  data: bigint | undefined;
  isCached: boolean;
} {
  const { chainId } = useFhevmContext();

  const query = useQuery({
    queryKey: params.handle && params.contractAddress && chainId
      ? fhevmKeys.decryptHandle(chainId, params.handle, params.contractAddress)
      : ["disabled"],
    queryFn: () => {
      // This should never be called - data comes from cache only
      throw new Error("Decryption must be triggered via useDecrypt");
    },
    enabled: false, // Never auto-fetch
    staleTime: Infinity, // Never consider stale
  });

  return {
    data: query.data,
    isCached: query.data !== undefined,
  };
}
```

**Commit message:** `feat(sdk): add useDecryptedValue hook for cached lookups`

---

### Phase 5: Refactor useEncrypt with useMutation

**Files to modify:**
- `src/react/useEncrypt.ts` - Add optional mutation wrapper

**Current pattern:** Returns async functions that user calls directly.

**Enhanced pattern:** Add mutation wrapper for better state tracking:

```typescript
export function useEncrypt(): UseEncryptReturn {
  const { instance, status, address } = useFhevmContext();

  const encryptMutation = useMutation({
    mutationKey: fhevmKeys.encrypt(),
    mutationFn: async ({
      value,
      contractAddress,
      type = "uint64"
    }: {
      value: number | bigint;
      contractAddress: string;
      type?: EncryptableType;
    }) => {
      if (!instance || !address) throw new Error("Not ready");

      const input = instance.createEncryptedInput(contractAddress, address);
      const method = `add${type.charAt(0).toUpperCase()}${type.slice(1)}` as keyof typeof input;
      (input as any)[method](value);

      return input.encrypt();
    },
  });

  // Keep existing async functions for backward compatibility
  const encrypt = useCallback(async (...) => { ... }, [...]);
  const encryptBatch = useCallback(async (...) => { ... }, [...]);
  const encryptWith = useCallback(async (...) => { ... }, [...]);

  return {
    isReady,
    encrypt,
    encryptBatch,
    encryptWith,
    // New mutation-based API
    encryptMutation: {
      mutate: encryptMutation.mutate,
      mutateAsync: encryptMutation.mutateAsync,
      isPending: encryptMutation.isPending,
      isError: encryptMutation.isError,
      error: encryptMutation.error,
      data: encryptMutation.data,
      reset: encryptMutation.reset,
    },
  };
}
```

**Commit message:** `feat(sdk): add mutation wrapper to useEncrypt`

---

### Phase 6: Add Signature Caching Query

**Files to create:**
- `src/react/useDecryptionSignature.ts` - Query/mutation for signature management

**Purpose:** Cache and manage decryption signatures with proper invalidation.

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useDecryptionSignature() {
  const { instance, chainId, address } = useFhevmContext();
  const { storage } = useInMemoryStorage();
  const queryClient = useQueryClient();

  // Query for cached signature
  const signatureQuery = useQuery({
    queryKey: chainId && address
      ? fhevmKeys.signatureFor(chainId, address)
      : ["disabled"],
    queryFn: async () => {
      if (!chainId || !address) return null;
      return FhevmDecryptionSignature.loadFromStorage(chainId, address, storage);
    },
    enabled: !!chainId && !!address,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Mutation for creating new signature
  const createSignature = useMutation({
    mutationFn: async (signer: ethers.Signer) => {
      if (!instance || !chainId || !address) {
        throw new Error("Not ready");
      }

      const signature = await FhevmDecryptionSignature.create({
        chainId,
        address,
        signer,
        instance,
        storage,
      });

      return signature;
    },
    onSuccess: (signature) => {
      // Update cache
      queryClient.setQueryData(
        fhevmKeys.signatureFor(chainId!, address!),
        signature
      );
    },
  });

  return {
    signature: signatureQuery.data,
    isLoading: signatureQuery.isLoading,
    hasSignature: !!signatureQuery.data,
    createSignature: createSignature.mutate,
    isCreating: createSignature.isPending,
  };
}
```

**Commit message:** `feat(sdk): add useDecryptionSignature hook with caching`

---

### Phase 7: Update Exports

**Files to modify:**
- `src/react/index.ts` - Export new hooks and query utilities

**New exports:**
```typescript
// Query utilities
export { fhevmQueryClient } from "./queryClient";
export { fhevmKeys } from "./queryKeys";

// New hooks
export { useDecryptedValue } from "./useDecryptedValue";
export { useDecryptionSignature } from "./useDecryptionSignature";
```

**Commit message:** `feat(sdk): export TanStack Query utilities and new hooks`

---

### Phase 8: Update Tests

**Files to modify:**
- `test/hooks.test.ts` - Update tests for new mutation-based hooks
- Create `test/queries.test.ts` - Test query key factory and caching

**Test coverage:**
1. Query key generation
2. Mutation state transitions
3. Cache invalidation
4. Error handling
5. Request deduplication

**Commit message:** `test(sdk): add tests for TanStack Query integration`

---

### Phase 9: Update Frontend Example

**Files to modify:**
- `packages/erc7984example/hooks/erc7984/useERC7984Wagmi.tsx` - Use new hooks

**Changes:**
- Replace `useFHEDecrypt` with `useDecrypt`
- Use cached values from `useDecryptedValue`
- Leverage mutation state for UI

**Commit message:** `refactor(frontend): use new TanStack Query hooks`

---

## New File Structure

```
src/react/
├── index.ts                    # Updated exports
├── FhevmProvider.tsx           # + QueryClientProvider wrapper
├── context.ts                  # Unchanged
├── queryClient.ts              # NEW: SDK query client
├── queryKeys.ts                # NEW: Query key factory
├── useEncrypt.ts               # + mutation wrapper
├── useDecrypt.ts               # Refactored to useMutation
├── useDecryptedValue.ts        # NEW: Cached value lookup
├── useDecryptionSignature.ts   # NEW: Signature caching
├── useFhevmStatus.ts           # Unchanged
├── useFhevmClient.ts           # Unchanged
├── useInMemoryStorage.tsx      # Unchanged
└── legacy/                     # Move deprecated hooks here
    ├── useFhevm.tsx
    ├── useFHEEncryption.ts
    └── useFHEDecrypt.ts
```

---

## API Changes Summary

### New Hooks
| Hook | Purpose |
|------|---------|
| `useDecryptedValue` | Query cached decrypted values |
| `useDecryptionSignature` | Manage signature caching |

### Modified Hooks
| Hook | Changes |
|------|---------|
| `useDecrypt` | Now uses `useMutation`, adds `isSuccess`, `isError` |
| `useEncrypt` | Adds optional `encryptMutation` object |

### New Exports
| Export | Purpose |
|--------|---------|
| `fhevmQueryClient` | SDK's QueryClient instance |
| `fhevmKeys` | Query key factory |

---

## Backward Compatibility

1. **useDecrypt** - Same return interface, adds new fields
2. **useEncrypt** - Same return interface, adds `encryptMutation`
3. **Legacy hooks** - Moved to `legacy/` but still exported with deprecation warnings
4. **FhevmProvider** - No API changes, internally wraps with QueryClientProvider

---

## Status: NOT STARTED

## Checklist

- [ ] Phase 1: Add TanStack Query dependency & provider setup
  - [ ] Add peer dependency to package.json
  - [ ] Create queryClient.ts
  - [ ] Update FhevmProvider with QueryClientProvider
  - [ ] Build and test
  - [ ] Commit

- [ ] Phase 2: Create query key factory
  - [ ] Create queryKeys.ts
  - [ ] Write tests
  - [ ] Commit

- [ ] Phase 3: Refactor useDecrypt with useMutation
  - [ ] Update useDecrypt.ts
  - [ ] Update tests
  - [ ] Verify backward compatibility
  - [ ] Commit

- [ ] Phase 4: Add useDecryptedValue hook
  - [ ] Create useDecryptedValue.ts
  - [ ] Write tests
  - [ ] Commit

- [ ] Phase 5: Refactor useEncrypt with useMutation
  - [ ] Update useEncrypt.ts
  - [ ] Update tests
  - [ ] Commit

- [ ] Phase 6: Add signature caching query
  - [ ] Create useDecryptionSignature.ts
  - [ ] Write tests
  - [ ] Commit

- [ ] Phase 7: Update exports
  - [ ] Update src/react/index.ts
  - [ ] Commit

- [ ] Phase 8: Update tests
  - [ ] Create test/queries.test.ts
  - [ ] Update test/hooks.test.ts
  - [ ] Commit

- [ ] Phase 9: Update frontend example
  - [ ] Update useERC7984Wagmi.tsx
  - [ ] Test manually
  - [ ] Commit

---

## Rollback Plan

If any phase breaks things:
1. Each phase is a separate commit, can revert individually
2. Legacy hooks remain functional throughout
3. QueryClientProvider is additive, removal is safe
