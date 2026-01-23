# FHEVM Developer Experience Simplification Plan

## Goal
Make fhevm-sdk hooks as simple and intuitive as wagmi hooks. Zero boilerplate, declarative patterns.

---

## Current Pain Points

### ERC7984Demo.tsx (Lines 29-75) - ~50 lines of FHEVM boilerplate

```typescript
// CURRENT: Too much setup code
const provider = useMemo(() => (window as any).ethereum, []);
const initialMockChains = { 31337: "http://localhost:8545" };
const [isMounted, setIsMounted] = useState(false);
const [fhevmEnabled, setFhevmEnabled] = useState(false);

useEffect(() => setIsMounted(true), []);
useEffect(() => {
  // Complex enable/disable logic with delays...
}, [isMounted, provider, chainId, fhevmEnabled]);

const { instance, status, error } = useFhevm({
  provider,
  chainId,
  initialMockChains,
  enabled: fhevmEnabled,
});

// Then pass instance to every hook that needs it
const erc7984 = useERC7984Wagmi({ instance, initialMockChains });
```

**Problem:** Uses legacy `useFhevm` hook instead of `FhevmProvider` context.

### FHEBenchmark.tsx - Accepts instance as prop instead of context

```typescript
// CURRENT: Receives instance as prop, duplicates mock chains config
type FHEBenchmarkProps = {
  instance: FhevmInstance | undefined;
  fhevmStatus: string;
};

export const FHEBenchmark = ({ instance, fhevmStatus }: FHEBenchmarkProps) => {
  const initialMockChains = { 31337: "http://localhost:8545" };  // Duplicated!
  const { ethersSigner } = useWagmiEthers(initialMockChains);    // Uses frontend hook

  // Manual encryption
  const input = instance.createEncryptedInput(erc7984.address, userAddress);
  (input as any).add64(BigInt(100));
  await (input as any).encrypt();
}
```

**Problems:**
1. Must pass `instance` as prop from parent
2. Duplicates `initialMockChains` config
3. Uses frontend's `useWagmiEthers` instead of SDK hook
4. Manual encryption builder pattern

### useWagmiEthers.ts - Should be in SDK

```typescript
// CURRENT: 70 lines in frontend, duplicates SDK functionality
export const useWagmiEthers = (initialMockChains?: Record<number, string>) => {
  const { data: walletClient } = useWalletClient();

  // Creates ethers provider from wagmi wallet client
  const ethersProvider = useMemo(() => {
    const eip1193Provider = { request: walletClient.request, ... };
    return new ethers.BrowserProvider(eip1193Provider);
  }, [walletClient]);

  // Creates signer
  const ethersSigner = useMemo(() => {
    return new ethers.JsonRpcSigner(ethersProvider, address);
  }, [ethersProvider, address]);

  return { chainId, accounts, isConnected, ethersSigner, ... };
}
```

**Problems:**
1. This should be in fhevm-sdk, not frontend
2. `initialMockChains` param duplicates FhevmConfig
3. Every consumer has to import from frontend hooks
4. Unnecessary refs (ropRef, chainIdRef) that aren't used

### useERC7984Wagmi.tsx - Complex hook parameters

```typescript
// CURRENT: useFHEDecrypt requires too many manual params
const { canDecrypt, decrypt, isDecrypting, results } = useFHEDecrypt({
  instance,                              // Manual
  ethersSigner: ethersSigner as any,     // Manual
  fhevmDecryptionSignatureStorage,       // Manual (from useInMemoryStorage)
  chainId,                               // Manual
  requests,                              // Must build manually
});

// CURRENT: useFHEEncryption requires manual setup
const { encryptWith } = useFHEEncryption({
  instance,                              // Manual
  ethersSigner: ethersSigner as any,     // Manual
  contractAddress: erc7984?.address,     // Manual
});

// CURRENT: Must determine encryption method from ABI
const getEncryptionMethodForTransfer = useCallback(() => {
  const functionAbi = erc7984?.abi.find(item =>
    item.type === "function" && item.name === "confidentialTransfer"
  );
  // ... 15+ lines of ABI parsing
  return { method: getEncryptionMethod(amountInput.internalType), error: undefined };
}, [erc7984]);

// CURRENT: Complex transfer with manual builder
const enc = await encryptWith(builder => {
  (builder as any)[method](amount);  // Dynamic method call
});
```

---

## Target Developer Experience

### 1. Zero FHEVM setup in components (use context)

```typescript
// TARGET: ERC7984Demo.tsx - No FHEVM setup needed!
export const ERC7984Demo = () => {
  const { isConnected } = useAccount();
  const { isReady } = useFhevmStatus();  // From context

  // Just use hooks - they get instance from context
  const erc7984 = useERC7984();

  // ... rest is just UI
}
```

### 2. Simple decrypt hook (like wagmi's useReadContract)

```typescript
// TARGET: Declarative decryption
const {
  data: balance,     // Decrypted value (bigint | undefined)
  decrypt,           // Trigger decryption
  isDecrypting,
  isDecrypted,
  error,
} = useFHEDecrypt({
  handle: balanceHandle,           // Just the handle
  contractAddress: '0x...',        // Just the contract
})

// Usage
<button onClick={decrypt} disabled={isDecrypting}>
  {isDecrypted ? `Balance: ${balance}` : 'Decrypt'}
</button>
```

### 3. Simple encrypt hook (like wagmi's useWriteContract)

```typescript
// TARGET: Simple encryption - type is optional, defaults to uint64
const { encrypt, isEncrypting, error } = useFHEEncrypt()

// Simple usage - just value and contract
const encrypted = await encrypt(100n, '0x...')

// Or with explicit type
const encrypted = await encrypt('uint128', 100n, '0x...')

// Result is ready to use in contract call
await contract.transfer(to, encrypted.handles[0], encrypted.inputProof)
```

### 4. Combined encrypt + write pattern

```typescript
// TARGET: Encrypt and call in one step (like useWriteContract)
const { write, isEncrypting, isPending, isSuccess } = useFHEWrite({
  contract: erc7984Contract,
  functionName: 'confidentialTransfer',
})

// Usage - encryption type is inferred from ABI
await write({
  args: [toAddress, amount],  // amount auto-encrypted based on ABI
})
```

---

## Implementation Phases

### Phase 1: Update ERC7984Demo to use FhevmProvider context

**Files to modify:**
- `app/_components/ERC7984Demo.tsx`

**Changes:**
1. Remove all FHEVM setup boilerplate (lines 29-75)
2. Use `useFhevmStatus()` to check readiness
3. Remove `instance` parameter from `useERC7984Wagmi`

**Before:**
```typescript
const provider = useMemo(() => ...);
const [isMounted, setIsMounted] = useState(false);
// ... 40+ more lines
const { instance } = useFhevm({ ... });
const erc7984 = useERC7984Wagmi({ instance, initialMockChains });
```

**After:**
```typescript
const { isReady, status } = useFhevmStatus();
const erc7984 = useERC7984();
```

**Commit message:** `refactor(frontend): remove FHEVM boilerplate from ERC7984Demo`

---

### Phase 2: Simplify useFHEDecrypt signature

**Files to modify:**
- `packages/fhevm-sdk/src/react/useUserDecrypt.ts`

**Current signature:**
```typescript
function useUserDecrypt(
  requests: readonly DecryptRequest[] | undefined,
  signer: ethers.JsonRpcSigner | undefined
): UseDecryptReturn
```

**New signature (add overloads):**
```typescript
// Simple single-handle usage
function useUserDecrypt(params: {
  handle: string | undefined;
  contractAddress: `0x${string}` | undefined;
}): UseDecryptReturn

// Batch usage (existing)
function useUserDecrypt(
  requests: readonly DecryptRequest[] | undefined,
  signer?: ethers.JsonRpcSigner | undefined
): UseDecryptReturn
```

**Key changes:**
1. Get signer from wagmi context automatically (optional override)
2. Support simple { handle, contractAddress } parameter
3. Internally build requests array

**Commit message:** `feat(sdk): simplify useUserDecrypt with single-handle overload`

---

### Phase 3: Simplify useFHEEncrypt signature

**Files to modify:**
- `packages/fhevm-sdk/src/react/useEncrypt.ts`

**Add simple encrypt function:**
```typescript
// Current - requires builder pattern
const { encryptWith } = useEncrypt()
const encrypted = await encryptWith(contractAddress, (builder) => {
  builder.add64(100n)
})

// New - direct value encryption
const { encrypt } = useEncrypt()
const encrypted = await encrypt(100n, contractAddress)
// or with type
const encrypted = await encrypt('uint128', 100n, contractAddress)
```

**Commit message:** `feat(sdk): add simple encrypt function to useEncrypt`

---

### Phase 4: Create useEthersSigner hook in SDK

**Files to create:**
- `packages/fhevm-sdk/src/react/useEthersSigner.ts`

**Purpose:** Get ethers signer from window.ethereum, compatible with wagmi.

```typescript
export function useEthersSigner(): {
  signer: ethers.JsonRpcSigner | undefined;
  isLoading: boolean;
  error: Error | undefined;
}
```

This removes need for `useWagmiEthers` in frontend.

**Commit message:** `feat(sdk): add useEthersSigner hook`

---

### Phase 5: Refactor useERC7984Wagmi to use new hooks

**Files to modify:**
- `packages/erc7984example/hooks/erc7984/useERC7984Wagmi.tsx`

**Changes:**
1. Remove `instance` parameter (use context)
2. Remove `initialMockChains` parameter
3. Use new simplified `useUserDecrypt`
4. Use new simplified `useEncrypt`
5. Remove `getEncryptionMethodForTransfer` complexity

**Before (40+ lines for decrypt/encrypt):**
```typescript
const { storage } = useInMemoryStorage();
const { ethersSigner } = useWagmiEthers(initialMockChains);

const requests = useMemo(() => {
  if (!hasContract || !balanceHandle) return undefined;
  return [{ handle: balanceHandle, contractAddress: erc7984!.address }];
}, [...]);

const { canDecrypt, decrypt, ... } = useFHEDecrypt({
  instance,
  ethersSigner,
  fhevmDecryptionSignatureStorage: storage,
  chainId,
  requests,
});

const { encryptWith } = useFHEEncryption({
  instance,
  ethersSigner,
  contractAddress: erc7984?.address,
});
```

**After (~10 lines):**
```typescript
const {
  data: balance,
  decrypt,
  isDecrypting
} = useUserDecrypt({
  handle: balanceHandle,
  contractAddress: erc7984?.address,
});

const { encrypt } = useEncrypt();
```

**Commit message:** `refactor(frontend): simplify useERC7984Wagmi with new hooks`

---

### Phase 6: Simplify transferTokens

**Current complexity:**
```typescript
const transferTokens = async (to: string, amount: number) => {
  // 1. Determine encryption method from ABI (15+ lines)
  const { method, error } = getEncryptionMethodForTransfer();

  // 2. Encrypt using builder pattern
  const enc = await encryptWith(builder => {
    (builder as any)[method](amount);
  });

  // 3. Get contract and call
  const writeContract = getContract("write");
  const transferFn = writeContract.getFunction("confidentialTransfer(...)");
  await transferFn(to, enc.handles[0], enc.inputProof);
}
```

**Target simplicity:**
```typescript
const transferTokens = async (to: string, amount: number) => {
  // 1. Encrypt (type defaults to uint64)
  const encrypted = await encrypt(amount, contractAddress);

  // 2. Call contract
  const tx = await contract.confidentialTransfer(
    to,
    encrypted.handles[0],
    encrypted.inputProof
  );
  await tx.wait();
}
```

**Commit message:** `refactor(frontend): simplify transferTokens`

---

### Phase 7: Refactor FHEBenchmark to use context

**Files to modify:**
- `packages/erc7984example/app/_components/FHEBenchmark.tsx`

**Current issues:**
1. Receives `instance` as prop instead of using context
2. Duplicates `initialMockChains` config
3. Uses frontend's `useWagmiEthers` instead of SDK hook

**Before:**
```typescript
type FHEBenchmarkProps = {
  instance: FhevmInstance | undefined;
  fhevmStatus: string;
};

export const FHEBenchmark = ({ instance, fhevmStatus }: FHEBenchmarkProps) => {
  const initialMockChains = { 31337: "http://localhost:8545" };  // Duplicated!
  const { ethersSigner } = useWagmiEthers(initialMockChains);

  // Manual encryption
  const input = instance.createEncryptedInput(erc7984.address, userAddress);
  (input as any).add64(BigInt(100));
  const encrypted = await (input as any).encrypt();
}
```

**After:**
```typescript
// No props needed - uses context
export const FHEBenchmark = () => {
  const { status } = useFhevmStatus();
  const { encrypt, isReady } = useEncrypt();

  // Simple encryption using SDK hook
  const encrypted = await encrypt('uint64', 100n, contractAddress);
}
```

**Changes:**
1. Remove `instance` and `fhevmStatus` props
2. Use `useFhevmStatus()` for status
3. Use `useEncrypt()` for encryption
4. Remove `initialMockChains` duplication
5. Remove `useWagmiEthers` import

**Commit message:** `refactor(frontend): FHEBenchmark uses context instead of props`

---

### Phase 8: Deprecate useWagmiEthers

**Files to modify:**
- `packages/erc7984example/hooks/wagmi/useWagmiEthers.ts`

**Current issues:**
1. 70+ lines of code duplicating SDK functionality
2. Used by FHEBenchmark and useERC7984Wagmi
3. `initialMockChains` param duplicates FhevmConfig

**Changes:**
After Phase 4 (useEthersSigner in SDK) and Phase 7 (FHEBenchmark refactor):
1. Check if any code still uses `useWagmiEthers`
2. If unused, delete the file
3. If still used, add deprecation notice pointing to SDK's `useEthersSigner`

**Commit message:** `chore(frontend): deprecate useWagmiEthers in favor of SDK hook`

---

## New File Structure

```
packages/fhevm-sdk/src/react/
├── useEncrypt.ts           # Add simple encrypt(value, contract) function
├── useUserDecrypt.ts           # Add simple { handle, contractAddress } overload
├── useEthersSigner.ts      # NEW: Get signer from window.ethereum
└── index.ts                # Export new hook

packages/erc7984example/
├── app/_components/
│   ├── ERC7984Demo.tsx     # Remove 50 lines of boilerplate
│   └── FHEBenchmark.tsx    # Use context instead of props
└── hooks/
    ├── erc7984/
    │   └── useERC7984Wagmi.tsx # Simplify with new hooks
    └── wagmi/
        └── useWagmiEthers.ts   # DEPRECATED: Use SDK's useEthersSigner
```

---

## API Comparison

### Decryption

| Current | Target |
|---------|--------|
| `useFHEDecrypt({ instance, ethersSigner, storage, chainId, requests })` | `useUserDecrypt({ handle, contractAddress })` |
| 5 required params | 2 params (or 1 object) |
| Must build requests array | Just pass handle |
| Must manage storage | Automatic |

### Encryption

| Current | Target |
|---------|--------|
| `encryptWith(contract, builder => builder.add64(val))` | `encrypt(val, contract)` |
| Builder pattern | Direct value |
| Must know method name | Auto-detected or defaults to uint64 |

---

## Status: COMPLETED

## Checklist

- [x] Phase 1: Update ERC7984Demo to use FhevmProvider context (commit: 6e58d82)
  - [x] Remove FHEVM setup boilerplate
  - [x] Use useFhevmStatus()
  - [x] Test manually
  - [x] Commit

- [x] Phase 2: Simplify useUserDecrypt signature (commit: 71b629e)
  - [x] Add single-handle overload
  - [x] Auto-get signer from window.ethereum
  - [x] Update tests
  - [x] Commit

- [x] Phase 3: Simplify useEncrypt signature (commit: 4cc9e7c)
  - [x] Add simple encrypt(value, contract) function
  - [x] Default type to uint64
  - [x] Update tests
  - [x] Commit

- [x] Phase 4: Create useEthersSigner hook (commit: 0f88a86)
  - [x] Create hook
  - [x] Add tests
  - [x] Export from index
  - [x] Commit

- [x] Phase 5: Refactor useERC7984Wagmi (commit: f625bbd)
  - [x] Remove instance parameter
  - [x] Use new hooks
  - [x] Test manually
  - [x] Commit

- [x] Phase 6: Simplify transferTokens (commit: f625bbd - combined with Phase 5)
  - [x] Use simple encrypt
  - [x] Remove ABI parsing
  - [x] Test manually
  - [x] Commit

- [x] Phase 7: Refactor FHEBenchmark to use context (commit: 51e5994)
  - [x] Remove instance and fhevmStatus props
  - [x] Use useFhevmStatus() for status
  - [x] Replace useWagmiEthers with useEthersSigner
  - [x] Remove initialMockChains duplication
  - [x] Test manually
  - [x] Commit

- [x] Phase 8: Deprecate useWagmiEthers (commit: 8f0b106)
  - [x] Check for remaining usages
  - [x] Delete file (no longer used)
  - [x] Commit

---

## Lines of Code Reduction Estimate

| File | Current | Target | Reduction |
|------|---------|--------|-----------|
| ERC7984Demo.tsx | 484 | ~400 | ~84 lines (-17%) |
| useERC7984Wagmi.tsx | 210 | ~120 | ~90 lines (-43%) |
| FHEBenchmark.tsx | 262 | ~200 | ~62 lines (-24%) |
| useWagmiEthers.ts | 70 | 0 | ~70 lines (-100%) |

**Total estimated reduction: ~306 lines (38% less code)**

---

## Backward Compatibility

1. **useUserDecrypt** - New overload, existing signature still works
2. **useEncrypt** - Add function, existing `encryptWith` still works
3. **Legacy hooks** - Still exported, marked deprecated
4. **FhevmProvider** - Already handles initialization

---

## Rollback Plan

Each phase is a separate commit. If issues arise:
1. Revert specific commit
2. Legacy hooks remain functional
3. No breaking changes to public API
