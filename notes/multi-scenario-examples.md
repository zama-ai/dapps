# Multi-Scenario Example Apps Plan

## Goal

Create minimal example apps to test and demonstrate fhevm-sdk working with different web3 library combinations:

1. **example-ethers** - ethers.js only (no wagmi, no viem)
2. **example-viem** - viem only (no wagmi, no ethers)
3. **example-wagmi** - wagmi only (minimal ethers usage)

## Current SDK Analysis

### Dependencies

```json
{
  "dependencies": {
    "ethers": "^6.13.4",           // Hard dependency
    "@zama-fhe/relayer-sdk": "^0.4.0-2"
  },
  "peerDependencies": {
    "@tanstack/react-query": ">=5.0.0",
    "react": ">=16.8.0"
  }
}
```

### Current ethers.js Usage

| File | Usage | Can be abstracted? |
|------|-------|-------------------|
| `useEthersSigner.ts` | `BrowserProvider`, `JsonRpcSigner` | Yes - use provider abstraction |
| `internal/fhevm.ts` | `isAddress`, `Eip1193Provider`, `JsonRpcProvider` | Yes - minimal usage |
| `FhevmDecryptionSignature.ts` | Signing with ethers | Yes - use generic signer interface |
| `useFHEDecrypt.ts` | ethers signer for decryption | Yes - use generic signer |
| `useUserDecrypt.ts` | ethers signer for decryption | Yes - use generic signer |
| `useFHEEncryption.ts` | ethers contract types | Yes - can simplify |
| `internal/mock/fhevmMock.ts` | `JsonRpcProvider`, `Contract` | Keep - mock mode only |

### Current wagmi Integration

The SDK doesn't import wagmi directly. It expects wagmi state via props:

```tsx
<FhevmProvider
  wagmi={{ isConnected, chainId, address }}  // Passed from useAccount()
>
```

This is already decoupled - we just need alternative ways to provide this state.

## SDK Refactoring Required

### Phase 1: Create Provider Abstraction

Create a generic provider/signer interface that can wrap different libraries:

```typescript
// src/types/provider.ts
export interface FhevmSigner {
  signMessage(message: string): Promise<string>;
  signTypedData(domain: any, types: any, value: any): Promise<string>;
  getAddress(): Promise<string>;
}

export interface FhevmProvider {
  request(args: { method: string; params?: any[] }): Promise<any>;
}
```

### Phase 2: Update Hooks to Use Abstraction

Replace direct ethers usage with the abstraction:

```typescript
// Before
import { ethers } from "ethers";
const signer = new ethers.BrowserProvider(window.ethereum).getSigner();

// After
import { createSigner } from "fhevm-sdk";
const signer = createSigner(window.ethereum); // Works with any EIP-1193 provider
```

### Phase 3: Create Adapter Hooks

Export adapter hooks for each library:

```typescript
// For ethers users
export { useEthersSigner } from "./adapters/ethers";

// For viem users
export { useViemSigner } from "./adapters/viem";

// For wagmi users
export { useWagmiSigner } from "./adapters/wagmi";
```

## Example Apps Structure

### 1. example-ethers

**Purpose**: Demonstrate SDK usage with ethers.js only

**Dependencies**:
```json
{
  "dependencies": {
    "fhevm-sdk": "workspace:*",
    "ethers": "^6.13.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

**Key Files**:
- `src/App.tsx` - Main app with FhevmProvider
- `src/EthersWalletConnect.tsx` - Connect wallet using ethers
- `src/EncryptDemo.tsx` - Encrypt/decrypt demo

**Wallet Connection Pattern**:
```tsx
import { ethers } from "ethers";

function useEthersWallet() {
  const [address, setAddress] = useState<string>();
  const [chainId, setChainId] = useState<number>();
  const [isConnected, setIsConnected] = useState(false);

  const connect = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const network = await provider.getNetwork();
    setAddress(accounts[0]);
    setChainId(Number(network.chainId));
    setIsConnected(true);
  };

  return { address, chainId, isConnected, connect };
}
```

### 2. example-viem

**Purpose**: Demonstrate SDK usage with viem only

**Dependencies**:
```json
{
  "dependencies": {
    "fhevm-sdk": "workspace:*",
    "viem": "^2.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

**Key Files**:
- `src/App.tsx` - Main app with FhevmProvider
- `src/ViemWalletConnect.tsx` - Connect wallet using viem
- `src/EncryptDemo.tsx` - Encrypt/decrypt demo

**Wallet Connection Pattern**:
```tsx
import { createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";

function useViemWallet() {
  const [address, setAddress] = useState<`0x${string}`>();
  const [chainId, setChainId] = useState<number>();
  const [isConnected, setIsConnected] = useState(false);

  const connect = async () => {
    const client = createWalletClient({
      transport: custom(window.ethereum),
    });
    const [addr] = await client.requestAddresses();
    const chain = await client.getChainId();
    setAddress(addr);
    setChainId(chain);
    setIsConnected(true);
  };

  return { address, chainId, isConnected, connect };
}
```

**Challenge**: SDK currently uses ethers for signing. Need to:
- Either keep ethers as internal dependency
- Or create viem-based signer adapter

### 3. example-wagmi

**Purpose**: Demonstrate SDK usage with wagmi (current approach, but minimal)

**Dependencies**:
```json
{
  "dependencies": {
    "fhevm-sdk": "workspace:*",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "@tanstack/react-query": "^5.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

**Key Files**:
- `src/App.tsx` - Main app with WagmiProvider + FhevmProvider
- `src/EncryptDemo.tsx` - Encrypt/decrypt demo using wagmi hooks

**Pattern** (current approach):
```tsx
import { useAccount } from "wagmi";
import { FhevmProvider } from "fhevm-sdk";

function App() {
  const { isConnected, chainId, address } = useAccount();

  return (
    <FhevmProvider wagmi={{ isConnected, chainId, address }}>
      <EncryptDemo />
    </FhevmProvider>
  );
}
```

## Implementation Order

### Step 1: Create example-wagmi (Easiest)

This is closest to current implementation:
1. Create minimal Next.js or Vite app
2. Add wagmi + fhevm-sdk
3. Implement connect + encrypt flow
4. Verify it works

### Step 2: Analyze SDK Changes Needed

Before creating ethers/viem examples:
1. Identify all ethers-specific code
2. Design abstraction layer
3. Decide: keep ethers as internal dep or make it optional?

### Step 3: Create example-ethers

1. Create minimal app
2. Implement custom wallet state management (no wagmi)
3. Pass state to FhevmProvider manually
4. May need SDK changes for signer handling

### Step 4: Create example-viem

1. Create minimal app
2. Implement viem-based wallet connection
3. Either:
   - Create viem signer adapter in SDK, or
   - Keep ethers as internal dep and convert viem to ethers signer

## Directory Structure

```
packages/
├── fhevm-sdk/              # The SDK
├── erc7984example/         # Full example (current, complex)
├── example-wagmi/          # Minimal wagmi example
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── wagmi.ts        # Wagmi config
│       └── EncryptDemo.tsx
├── example-ethers/         # Minimal ethers example
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── useWallet.ts    # Custom wallet hook
│       └── EncryptDemo.tsx
└── example-viem/           # Minimal viem example
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── useWallet.ts    # Viem-based wallet hook
        └── EncryptDemo.tsx
```

## Open Questions

1. **Should ethers remain a hard dependency?**
   - Pro: Simpler, relayer-sdk may need it anyway
   - Con: Larger bundle for viem-only users

2. **How to handle signing for viem users?**
   - Option A: Use viem's signTypedData, create adapter
   - Option B: Keep ethers internally, wrap viem provider

3. **Should we support non-React usage?**
   - Core encrypt/decrypt functions without React hooks
   - Would enable Vue, Svelte, vanilla JS usage

4. **Test strategy for CI?**
   - Build check for each example
   - E2E tests with mock chain?

## Success Criteria

Each example app should:
- [x] Connect to wallet
- [x] Display FHEVM status
- [x] Encrypt a value
- [ ] Decrypt a value (if applicable)
- [x] Build without errors
- [ ] Work with local hardhat mock chain

## Implementation Status

All three example apps have been created and are functional:

### example-wagmi (port 5173)
- Uses `create-wagmi` CLI template
- Uses `useConnection` and `useConnectorClient` hooks (latest wagmi API)
- Gets EIP-1193 provider from wagmi connector client transport
- Files: `fhevmConfig.ts`, `FhevmWrapper.tsx`, `EncryptDemo.tsx`

### example-ethers (port 5174)
- Uses Vite + React template + ethers.js
- Custom `useWallet.ts` hook using `BrowserProvider`
- Uses `getAddress()` for checksummed addresses
- Vite config includes `resolve.dedupe` for React

### example-viem (port 5175)
- Uses Vite + React template + viem
- Custom `useWallet.ts` hook using `createWalletClient`
- Uses `getAddress()` for checksummed addresses
- Vite config includes `resolve.dedupe` for React

### Key Implementation Details

**FhevmProvider Usage Pattern:**
```tsx
<FhevmProvider
  config={fhevmConfig}
  provider={window.ethereum}  // or connector transport
  address={address}           // checksummed address
  chainId={chainId}
  isConnected={isConnected}
  storage={memoryStorage}     // explicit storage choice
>
```

**Issues Resolved:**
1. React version mismatch - Fixed with `resolve.dedupe` in Vite config
2. Address validation errors - Fixed by using `getAddress()` for checksumming
3. BigInt serialization - Fixed in SDK's `signTypedData()` function

## Completed Steps

1. [x] Create example-wagmi first (validate current SDK works)
2. [x] Analyze what SDK changes are needed for ethers-only
3. [x] Create example-ethers
4. [x] Decide on viem strategy (use EIP-1193 directly)
5. [x] Create example-viem
6. [ ] Add CI build checks for all examples
7. [x] Document each integration pattern (see sdk-restructure-provider-only.md)
