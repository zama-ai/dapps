# fhevm-sdk Wagmi-Style Refactor Plan

## Goal
Restructure fhevm-sdk to have a developer experience like wagmi - minimal setup, seamless integration.

## Current Pain Points

The current setup in ERC7984Demo.tsx requires ~50 lines of boilerplate:
```typescript
// Current painful pattern:
const provider = useMemo(() => (window as any).ethereum, []);
const [isMounted, setIsMounted] = useState(false);
const [fhevmEnabled, setFhevmEnabled] = useState(false);
useEffect(() => setIsMounted(true), []);
useEffect(() => { /* complex enable/disable logic with delays */ }, [...]);
const { instance, status, error } = useFhevm({ provider, chainId, initialMockChains, enabled: fhevmEnabled });
```

## Target DX

```typescript
// app/providers.tsx - one-time setup
import { FhevmProvider, createFhevmConfig, sepolia, hardhatLocal } from 'fhevm-sdk'

const config = createFhevmConfig({
  chains: [sepolia, hardhatLocal],
})

function Providers({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <FhevmProvider config={config}>
        {children}
      </FhevmProvider>
    </WagmiProvider>
  )
}

// In any component - zero setup:
const { encrypt, isReady } = useEncrypt()
const { data, decrypt } = useUserDecrypt({ handle, contractAddress })
```

---

## Implementation Phases

### Phase 1: Chain Definitions and Types
**Files to create:**
```
src/chains/
├── index.ts           # Export all chains + types
├── types.ts           # FhevmChain type definition
├── sepolia.ts         # Sepolia chain config
├── hardhat.ts         # Local hardhat chain config
└── defineChain.ts     # Helper to create custom chains
```

**FhevmChain type:**
```typescript
type FhevmChain = {
  id: number
  name: string
  network: string
  rpcUrl?: string
  aclAddress: `0x${string}`
  gatewayUrl: string
  kmsAddress: `0x${string}`
  isMock: boolean
}
```

**Commit message:** `feat(sdk): add chain definitions for wagmi-style config`

---

### Phase 2: Config System
**Files to create:**
- `src/config.ts` - createFhevmConfig factory
- `src/types.ts` - Shared types

**createFhevmConfig signature:**
```typescript
export function createFhevmConfig(options: {
  chains: FhevmChain[]
  storage?: FhevmStorage  // defaults to localStorage
  ssr?: boolean           // SSR mode flag
}): FhevmConfig
```

**FhevmConfig object provides:**
- `chains` - configured chains
- `storage` - persistence layer
- `getChain(chainId)` - get chain by ID
- `isMockChain(chainId)` - check if mock

**Commit message:** `feat(sdk): add createFhevmConfig for wagmi-style setup`

---

### Phase 3: FhevmProvider with Wagmi Integration
**Files to create:**
- `src/react/FhevmProvider.tsx` - Main provider
- `src/react/context.ts` - React context

**Provider responsibilities:**
1. Hold FhevmConfig in React Context
2. Auto-initialize instance when wagmi connects
3. Handle SSR hydration
4. Manage instance lifecycle (create/destroy on chain change)
5. Listen to wagmi's useAccount() for connection changes
6. Get provider from wagmi's useWalletClient()

**Context value:**
```typescript
type FhevmContextValue = {
  config: FhevmConfig
  instance: FhevmInstance | undefined
  status: 'idle' | 'initializing' | 'ready' | 'error'
  error: Error | undefined
  chainId: number | undefined
}
```

**Commit message:** `feat(sdk): add FhevmProvider with wagmi auto-integration`

---

### Phase 4: Refactor Hooks

**Hook renames:**
| Current | New | Purpose |
|---------|-----|---------|
| `useFhevm()` | `useFhevmContext()` | Internal context access |
| `useFHEEncryption()` | `useEncrypt()` | Encrypt values |
| `useFHEDecrypt()` | `useUserDecrypt()` | Decrypt handles |
| `useInMemoryStorage()` | Remove | Use config.storage |
| - | `useFhevmStatus()` | Get status/error |
| - | `useFhevmClient()` | Get raw instance |

**New hook signatures:**
```typescript
// Status hook
function useFhevmStatus(): {
  status: 'idle' | 'initializing' | 'ready' | 'error'
  error: Error | undefined
  isReady: boolean
}

// Encryption hook
function useEncrypt(): {
  encrypt: <T extends EncryptableType>(
    value: T,
    contractAddress: Address
  ) => Promise<EncryptedInput>
  encryptBatch: (inputs: EncryptInput[]) => Promise<EncryptedInput[]>
  isReady: boolean
}

// Decryption hook
function useUserDecrypt(params: {
  handle: string | undefined
  contractAddress: Address | undefined
}): {
  data: bigint | undefined
  decrypt: () => Promise<void>
  isDecrypting: boolean
  error: Error | undefined
}
```

**Commit message:** `feat(sdk): add wagmi-style hooks (useEncrypt, useUserDecrypt, useFhevmStatus)`

---

### Phase 5: Update Exports

**New package.json exports:**
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./chains": "./dist/chains/index.js",
    "./react": "./dist/react/index.js"
  }
}
```

**Main entry (src/index.ts):**
```typescript
// Config
export { createFhevmConfig } from './config'
export type { FhevmConfig, FhevmConfigOptions } from './config'

// Chains
export * from './chains'

// React (convenience re-export)
export * from './react'
```

**Backward compatibility:**
- Keep old exports working but mark as @deprecated
- Old useFhevm() signature still works but logs deprecation warning

**Commit message:** `feat(sdk): update exports with backward compatibility`

---

### Phase 6: Update Frontend Example

Update `packages/erc7984example` to use the new API:

1. Create `app/providers.tsx` with FhevmProvider setup
2. Simplify ERC7984Demo.tsx to use new hooks
3. Remove all the boilerplate mounting/enabling logic

**Commit message:** `refactor(frontend): use new fhevm-sdk wagmi-style API`

---

### Phase 7: Tests and Verification

1. Run SDK tests: `pnpm sdk:test`
2. Run hardhat tests: `pnpm test`
3. Start local chain and test frontend manually
4. Verify SSR works with `pnpm next:build`

**Commit message:** `test(sdk): add tests for wagmi-style API`

---

## New File Structure

```
src/
├── index.ts                    # Main exports
├── config.ts                   # createFhevmConfig
├── types.ts                    # Shared types
├── errors.ts                   # Error classes
│
├── chains/
│   ├── index.ts               # Export chains + defineChain
│   ├── types.ts               # FhevmChain type
│   ├── sepolia.ts             # Sepolia config
│   ├── hardhat.ts             # Hardhat local config
│   └── defineChain.ts         # Custom chain helper
│
├── core/                       # Framework-agnostic core
│   ├── index.ts
│   ├── createInstance.ts      # Instance creation
│   ├── encryption.ts          # Encryption utilities
│   ├── decryption.ts          # Decryption utilities
│   └── storage/
│       ├── index.ts
│       ├── publicKeys.ts      # IndexedDB for public keys
│       └── signatures.ts      # Signature persistence
│
├── react/
│   ├── index.ts               # React exports
│   ├── FhevmProvider.tsx      # Main provider
│   ├── context.ts             # React context
│   ├── useEncrypt.ts          # Encryption hook
│   ├── useUserDecrypt.ts          # Decryption hook
│   ├── useFhevmStatus.ts      # Status hook
│   └── useFhevmClient.ts      # Raw instance access
│
└── internal/                   # Keep for backward compat (deprecated)
    └── ...existing files...
```

---

## Status: COMPLETED

All phases implemented and tested. See commits on `feat/fhevm-sdk-wagmi-style` branch.

## Checklist

- [x] Phase 1: Chain definitions (commit: 0a52864)
  - [x] Create src/chains/types.ts
  - [x] Create src/chains/sepolia.ts
  - [x] Create src/chains/hardhat.ts
  - [x] Create src/chains/defineChain.ts
  - [x] Create src/chains/index.ts
  - [x] Write tests
  - [x] Commit

- [x] Phase 2: Config system (commit: 992b044)
  - [x] Create src/config.ts
  - [x] Write tests
  - [x] Commit

- [x] Phase 3: FhevmProvider (commit: 47e69bd)
  - [x] Create src/react/context.ts
  - [x] Create src/react/FhevmProvider.tsx
  - [x] Create src/react/useFhevmStatus.ts
  - [x] Create src/react/useFhevmClient.ts
  - [x] Write tests
  - [x] Commit

- [x] Phase 4: Hooks (commit: 695f0e1)
  - [x] Create src/react/useEncrypt.ts
  - [x] Create src/react/useUserDecrypt.ts
  - [x] Write tests
  - [x] Commit

- [x] Phase 5: Exports (commit: 02cce37)
  - [x] Update src/index.ts
  - [x] Update src/react/index.ts
  - [x] Update package.json exports
  - [x] Commit

- [x] Phase 6: Frontend (commit: f0c2b1e)
  - [x] Create components/FhevmSetup.tsx
  - [x] Update DappWrapperWithProviders.tsx
  - [x] Test manually
  - [x] Commit

- [x] Phase 7: Final verification
  - [x] Run all SDK tests (53 passed)
  - [x] Run frontend type check
  - [x] Run frontend lint

---

## Rollback Plan

If any phase breaks things:
1. `git stash` or `git reset --hard HEAD~1` to undo last commit
2. Each phase is a separate commit, so can cherry-pick working ones
3. Old API remains functional throughout (backward compat)
