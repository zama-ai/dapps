# fhevm-sdk Restructure: Provider-Only Design

## Overview

Restructure fhevm-sdk to use EIP-1193 providers directly, removing the hard ethers.js dependency for end users. Security decisions are explicitly delegated to dapp developers.

## Goals

1. **No web3 library lock-in** - Works with ethers, viem, wagmi, or raw `window.ethereum`
2. **Security is developer's responsibility** - SDK does not make security decisions
3. **Explicit key management** - No hidden storage, developers control where keys go
4. **Minimal bundle size** - Only ship what's needed

## Architecture

### Core Principle: EIP-1193 Only

The SDK only requires an EIP-1193 provider (the standard wallet interface):

```typescript
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}
```

This is what `window.ethereum` provides, and what wagmi/viem/ethers all wrap.

### Signing via EIP-1193

Instead of depending on ethers for `signTypedData`, use the raw EIP-1193 method:

```typescript
// Current (ethers-dependent)
const signature = await signer.signTypedData(domain, types, message);

// New (EIP-1193 only)
const signature = await provider.request({
  method: 'eth_signTypedData_v4',
  params: [address, JSON.stringify({ domain, types, primaryType, message })]
});
```

### Address Validation

Replace `ethers.isAddress` with a simple regex or lightweight utility:

```typescript
function isAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}
```

### RPC Calls

Use the EIP-1193 provider directly:

```typescript
// Current (ethers)
const provider = new JsonRpcProvider(rpcUrl);
const chainId = await provider.getNetwork().then(n => n.chainId);

// New (fetch-based for RPC URLs, EIP-1193 for wallets)
async function rpcCall(rpcUrl: string, method: string, params: unknown[] = []) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

// Or via EIP-1193 provider
const chainId = await provider.request({ method: 'eth_chainId' });
```

## Security Model

### Principle: SDK Does NOT Handle Security

The SDK provides functionality, NOT security guarantees. Developers must:

1. **Choose their own storage** - SDK does not default to any storage
2. **Manage their own keys** - SDK does not store private keys automatically
3. **Handle their own signatures** - SDK does not cache EIP-712 signatures by default

### What the SDK DOES

- Provides encryption/decryption functions
- Generates keypairs when asked
- Creates EIP-712 typed data structures for signing
- Calls the relayer API

### What the SDK DOES NOT DO

- Store private keys automatically
- Cache signatures without explicit developer consent
- Make assumptions about storage security
- Persist any sensitive data by default

## Key Management Design

### Current Problem

The current `FhevmDecryptionSignature` class:
- Generates keypairs internally
- Stores them in developer-provided storage
- Caches signatures automatically

This is problematic because:
- Developers may not realize private keys are being stored
- Storage security varies (IndexedDB vs localStorage vs memory)
- No explicit consent for persistence

### New Design: Explicit Key Management

```typescript
// Option 1: Developer manages everything (RECOMMENDED)
const keypair = fhevm.generateKeypair(); // Returns { publicKey, privateKey }
// Developer stores keypair however they want (or doesn't store it)

const eip712 = fhevm.createDecryptionRequest({
  publicKey: keypair.publicKey,
  contractAddresses: ['0x...'],
  startTimestamp: Math.floor(Date.now() / 1000),
  durationDays: 1, // Short-lived by default
});

// Developer signs it themselves
const signature = await provider.request({
  method: 'eth_signTypedData_v4',
  params: [address, JSON.stringify(eip712)]
});

// Developer decrypts with their keypair
const result = await fhevm.decrypt({
  handles: ['0x...'],
  privateKey: keypair.privateKey,
  publicKey: keypair.publicKey,
  signature,
  // ... other params
});
```

```typescript
// Option 2: SDK helper with explicit storage (OPTIONAL CONVENIENCE)
const { decrypt } = useUserDecrypt({
  contractAddress: '0x...',
  handle: '0x...',
  // Developer MUST provide storage - no default
  storage: mySecureStorage, // implements GenericStringStorage
  // Developer MUST provide signer function
  signTypedData: async (data) => {
    return provider.request({ method: 'eth_signTypedData_v4', params: [...] });
  },
});
```

### Storage Interface

```typescript
interface FhevmStorage {
  // All methods are async to support various backends
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

// SDK provides implementations but DOES NOT choose one by default
export const memoryStorage: FhevmStorage = { ... }; // Cleared on refresh
export const localStorageAdapter: FhevmStorage = { ... }; // Persistent, not encrypted
export const indexedDBAdapter: FhevmStorage = { ... }; // Persistent, not encrypted

// Developers can create their own
const encryptedStorage: FhevmStorage = {
  async get(key) {
    const encrypted = localStorage.getItem(key);
    return encrypted ? decrypt(encrypted, userPassword) : null;
  },
  async set(key, value) {
    localStorage.setItem(key, encrypt(value, userPassword));
  },
  async remove(key) {
    localStorage.removeItem(key);
  }
};
```

## API Design

### FhevmProvider Props

```typescript
interface FhevmProviderProps {
  // Required: Configuration for the chain
  config: FhevmConfig;

  // Required: EIP-1193 provider (window.ethereum, wagmi connector, etc.)
  provider: Eip1193Provider;

  // Required: Connected wallet address (developer provides this)
  address: `0x${string}` | undefined;

  // Required: Current chain ID (developer provides this)
  chainId: number | undefined;

  // Required: Whether wallet is connected (developer provides this)
  isConnected: boolean;

  // Optional: Storage for caching (NO DEFAULT - must be explicit)
  storage?: FhevmStorage;

  children: ReactNode;
}
```

### Usage Examples

#### With wagmi

```tsx
import { useAccount, useWalletClient } from 'wagmi';
import { FhevmProvider, createFhevmConfig, memoryStorage } from 'fhevm-sdk';

function App() {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();

  return (
    <FhevmProvider
      config={createFhevmConfig({ chain: sepolia })}
      provider={walletClient ?? window.ethereum}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage} // Explicit: keys cleared on refresh
    >
      <MyApp />
    </FhevmProvider>
  );
}
```

#### With viem only

```tsx
import { createWalletClient, custom } from 'viem';
import { FhevmProvider, createFhevmConfig } from 'fhevm-sdk';
import { useWallet } from './useWallet'; // Custom hook from example-viem

function App() {
  const { address, chainId, isConnected, client } = useWallet();

  return (
    <FhevmProvider
      config={createFhevmConfig({ chain: sepolia })}
      provider={window.ethereum}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      // No storage = keys are not cached, re-sign every time
    >
      <MyApp />
    </FhevmProvider>
  );
}
```

#### With ethers only

```tsx
import { BrowserProvider } from 'ethers';
import { FhevmProvider, createFhevmConfig, indexedDBStorage } from 'fhevm-sdk';
import { useWallet } from './useWallet'; // Custom hook from example-ethers

function App() {
  const { address, chainId, isConnected } = useWallet();

  return (
    <FhevmProvider
      config={createFhevmConfig({ chain: sepolia })}
      provider={window.ethereum}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={indexedDBStorage} // Developer chose persistent storage
    >
      <MyApp />
    </FhevmProvider>
  );
}
```

### useEncrypt (unchanged)

Encryption doesn't involve private keys, so it remains simple:

```typescript
const { encrypt, isReady } = useEncrypt();

const [amountHandle, proof] = await encrypt(
  [{ type: 'uint64', value: 100n }],
  contractAddress
);
```

### useUserDecrypt (redesigned)

```typescript
interface UseUserDecryptOptions {
  handle: string | undefined;
  contractAddress: `0x${string}` | undefined;

  // Optional: Provide your own keypair (for advanced use cases)
  keypair?: { publicKey: string; privateKey: string };

  // Optional: Custom sign function (defaults to using provider from context)
  signTypedData?: (data: EIP712TypedData) => Promise<string>;
}

interface UseUserDecryptReturn {
  // Decrypted value, or undefined if not yet decrypted
  value: bigint | string | boolean | undefined;

  // Trigger decryption (will prompt for signature if needed)
  decrypt: () => Promise<void>;

  // State
  isDecrypting: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | undefined;

  // Whether decrypt() can be called
  canDecrypt: boolean;
}

function useUserDecrypt(options: UseUserDecryptOptions): UseUserDecryptReturn;
```

## EIP-712 Typed Data

The SDK creates the typed data structure, developer signs it:

```typescript
// SDK provides this
function createDecryptionEIP712(params: {
  publicKey: string;
  contractAddresses: `0x${string}`[];
  userAddress: `0x${string}`;
  startTimestamp: number;
  durationDays: number;
  chainId: number;
}): EIP712TypedData {
  return {
    domain: {
      name: 'FHEVM Decryption',
      version: '1',
      chainId: params.chainId,
    },
    types: {
      UserDecryptRequestVerification: [
        { name: 'publicKey', type: 'bytes' },
        { name: 'contractAddresses', type: 'address[]' },
        { name: 'startTimestamp', type: 'uint256' },
        { name: 'durationDays', type: 'uint256' },
      ],
    },
    primaryType: 'UserDecryptRequestVerification',
    message: {
      publicKey: params.publicKey,
      contractAddresses: params.contractAddresses,
      startTimestamp: params.startTimestamp,
      durationDays: params.durationDays,
    },
  };
}
```

## What Stays in ethers (Internal Only)

For mock mode (hardhat local development), we still need ethers for:
- `Contract` - to interact with mock FHE contracts
- `JsonRpcProvider` - for RPC calls to local node

This is acceptable because:
1. Mock mode is development-only
2. It's dynamically imported (not in production bundle)
3. Developers using mock mode likely have ethers anyway

```typescript
// internal/mock/fhevmMock.ts
// This file is ONLY loaded when connecting to a Hardhat node
import { JsonRpcProvider, Contract } from 'ethers';
```

## Migration Path

### For existing users

```typescript
// Before (ethers required, implicit storage)
<FhevmProvider
  config={config}
  wagmi={{ isConnected, chainId, address }}
>

// After (explicit everything)
<FhevmProvider
  config={config}
  provider={window.ethereum}
  address={address}
  chainId={chainId}
  isConnected={isConnected}
  storage={indexedDBStorage} // or memoryStorage, or your own
>
```

### Breaking changes

1. `wagmi` prop removed - pass `address`, `chainId`, `isConnected` directly
2. `storage` no longer has a default - must be explicit or omitted (no caching)
3. `useEthersSigner` hook removed - developers use their own library
4. Decryption may require re-signing if no storage provided

## File Changes

### Remove
- `src/react/useEthersSigner.ts` - No longer needed

### Modify
- `src/react/FhevmProvider.tsx` - New props, remove wagmi integration
- `src/react/useUserDecrypt.ts` - Use EIP-1193 for signing
- `src/FhevmDecryptionSignature.ts` - Remove ethers, use EIP-1193
- `src/internal/fhevm.ts` - Replace ethers utilities with lightweight alternatives

### Add
- `src/internal/eip1193.ts` - EIP-1193 utilities (signTypedData, address validation)
- `src/internal/rpc.ts` - Simple JSON-RPC client for URL-based providers
- `src/storage/adapters.ts` - Pre-built storage adapters (memory, localStorage, indexedDB)

### Keep (internal only)
- `src/internal/mock/fhevmMock.ts` - Still uses ethers for mock contracts

## Security Considerations

### What developers MUST understand

1. **Private keys for decryption are sensitive** - They allow decrypting any value the signature covers
2. **EIP-712 signatures grant decryption rights** - Treat them like transaction signatures
3. **Storage choice matters**:
   - `memoryStorage`: Keys lost on refresh, most secure but worst UX
   - `localStorageAdapter`: Persistent, but accessible to any JS on the page
   - `indexedDBStorage`: Persistent, slightly better isolation than localStorage
   - Custom encrypted storage: Best security, developer responsibility

### Recommendations for developers

1. **Use short-lived signatures** - `durationDays: 1` instead of 365
2. **Scope to specific contracts** - Don't use wildcard contract addresses
3. **Consider memory storage** - Accept the UX tradeoff for better security
4. **Clear storage on disconnect** - Don't leave keys around

### What the SDK does to help

1. **No default storage** - Forces developers to make a conscious choice
2. **Warns in console** - If using persistent storage in development
3. **Short default duration** - Default `durationDays` is 1, not 365
4. **Clear documentation** - Explains security implications

## Implementation Order

1. Create `src/internal/eip1193.ts` with utilities
2. Create `src/internal/rpc.ts` for RPC calls
3. Update `FhevmDecryptionSignature.ts` to use EIP-1193
4. Update `FhevmProvider.tsx` with new props
5. Update `useUserDecrypt.ts` to use new signing
6. Remove `useEthersSigner.ts`
7. Update documentation
8. Update example apps

## Open Questions

1. **Should we keep `useEthersSigner` as a convenience?** - Leaning no, it couples to ethers
2. **Default storage behavior?** - Leaning towards NO default (force explicit choice)
3. **Should storage be required or optional?** - Optional, but with clear implications
4. **TypedDataEncoder.hash replacement?** - Need this for storage keys, can implement ourselves or use a tiny library

## Implementation Status

### Completed

1. **`src/internal/eip1193.ts`** - EIP-1193 utilities
   - `signTypedData()` - Signs EIP-712 typed data via `eth_signTypedData_v4`
   - `isAddress()` - Validates Ethereum addresses
   - `getChainId()`, `getAccounts()`, `requestAccounts()` - Provider utilities
   - `hashTypedDataForKey()` - Creates cache keys for storage
   - **Fix**: Added BigInt serialization support for `chainId` in typed data

2. **`src/internal/rpc.ts`** - JSON-RPC client for URL-based providers

3. **`src/storage/adapters.ts`** - Storage adapters
   - `memoryStorage` - In-memory, cleared on refresh (most secure)
   - `localStorageAdapter` - Persistent in localStorage
   - `sessionStorageAdapter` - Cleared when tab closes
   - `noOpStorage` - No caching, re-sign every time

4. **`src/FhevmDecryptionSignature.ts`** - Updated to use EIP-1193
   - New `SignerParams` interface: `{ provider: Eip1193Provider, address: \`0x${string}\` }`
   - Removed ethers dependency for signing

5. **`src/react/FhevmProvider.tsx`** - New explicit props
   - Added `provider`, `address`, `chainId`, `isConnected`, `storage` props
   - Deprecated `wagmi` prop (still works for backwards compatibility)

6. **`src/react/useUserDecrypt.ts`** - Uses EIP-1193 for signing
   - Gets provider and address from context
   - Falls back to `noOpStorage` if no storage provided

7. **Legacy hooks updated** - `useFHEEncryption.ts`, `useFHEDecrypt.ts`, `useFhevm.tsx`
   - Marked as deprecated, updated to use new EIP-1193 types

8. **Example apps created**
   - `packages/example-wagmi` - wagmi + fhevm-sdk integration
   - `packages/example-ethers` - ethers.js + fhevm-sdk integration
   - `packages/example-viem` - viem + fhevm-sdk integration

### Key Fixes During Implementation

1. **BigInt serialization** - `JSON.stringify` can't serialize BigInt. Fixed by adding a custom replacer in `signTypedData()` that converts BigInt to Number.

2. **React version mismatch** - Monorepo had multiple React versions causing "Invalid hook call" errors. Fixed by adding `resolve.dedupe` in Vite configs.

3. **Address checksumming** - Wallets sometimes return lowercase addresses. Fixed by using `getAddress()` from ethers/viem to ensure checksummed addresses.

4. **wagmi API changes** - The latest wagmi uses `useConnection` instead of `useAccount`. Updated example-wagmi accordingly (erc7984example still uses wagmi 2.x with `useAccount`).

## Summary

| Aspect | Current | New |
|--------|---------|-----|
| Web3 library | ethers required | EIP-1193 only |
| Storage | Default IndexedDB | No default, explicit choice |
| Key management | Automatic | Developer-controlled |
| Security responsibility | Ambiguous | Explicitly developer's |
| Bundle size | ~150KB (ethers) | ~10KB (core only) |
