# Plan: Shield/Unshield Hooks for ERC20 ↔ ERC7984 Conversion

Convert ERC20 tokens to confidential ERC7984 tokens ("shield") and back ("unshield").

## Overview

| Operation | Direction | Contract Method | Requires Encryption |
|-----------|-----------|-----------------|---------------------|
| Shield (wrap) | ERC20 → ERC7984 | `wrap(to, amount)` | No |
| Unshield (unwrap) | ERC7984 → ERC20 | `unwrap(from, to, encryptedAmount, inputProof)` | Yes |

## Token Registry (Sepolia)

```typescript
const WRAPPER_TOKENS = {
  cTEST1: {
    wrapper: "0x593E77e7E2bEe748aa27942E1f2069b5B6902625",
    underlying: "0x0D03CF79A2798b35C27b2b52B23674742D278F90",
    symbol: "cTEST1",
    underlyingSymbol: "TEST1",
    decimals: 18,
  },
  cTEST2: {
    wrapper: "0x9942aBbEAb7f5BcefbA3d9865B148aA79B2E82eB",
    underlying: "0xD616Bc7D4dbC05450dA7F7d3678e4047300bdc40",
    symbol: "cTEST2",
    underlyingSymbol: "TEST2",
    decimals: 18,
  },
} as const;
```

## Files to Create/Modify

### SDK Package (`packages/fhevm-sdk`)

| File | Status | Purpose |
|------|--------|---------|
| `src/abi/erc20toerc7984.ts` | Existing | Full wrapper ABI (wrap, unwrap, underlying, etc.) |
| `src/abi/ERC20.ts` | **Done** | Minimal ERC20 ABI (approve, allowance, balanceOf) |
| `src/abi/index.ts` | **Done** | Export ERC20 ABI + ERC20TOERC7984_ABI |
| `src/types/shield.ts` | **Done** | Types for shield/unshield hooks |
| `src/types/index.ts` | **Done** | Export shield types |
| `src/react/useShield.ts` | **Done** | Hook for ERC20 → ERC7984 |
| `src/react/useUnshield.ts` | **Done** | Hook for ERC7984 → ERC20 |
| `src/react/index.ts` | **Done** | Export new hooks |
| `src/index.ts` | **Done** | Export new hooks and types |

### Frontend Package (`packages/erc7984example`)

| File | Status | Purpose |
|------|--------|---------|
| `app/shield/page.tsx` | **Done** | Shield/Unshield demo page |
| `app/shield/_components/ShieldDemo.tsx` | **Done** | Main demo component |
| `utils/tokens.ts` | **Done** | Token registry with addresses |

---

## 1. ABIs

The wrapper ABI already exists at `src/abi/erc20toerc7984.ts` with `ERC20TOERC7984_ABI`.

### `src/abi/ERC20.ts` (new)

```typescript
export const ERC20_ABI = [
  // approve(address spender, uint256 amount) → bool
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // allowance(address owner, address spender) → uint256
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // balanceOf(address account) → uint256
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // decimals() → uint8
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  // symbol() → string
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
```

---

## 2. Types (`src/types/shield.ts`)

```typescript
export type ShieldStatus = "idle" | "checking-allowance" | "approving" | "wrapping" | "confirming" | "success" | "error";
export type UnshieldStatus = "idle" | "encrypting" | "signing" | "confirming" | "success" | "error";

export interface UseShieldOptions {
  /** ERC7984 wrapper contract address */
  wrapperAddress: `0x${string}`;
  /** Underlying ERC20 token address (optional, will be fetched if not provided) */
  underlyingAddress?: `0x${string}`;
  /** Callback on successful shield */
  onSuccess?: (txHash: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseShieldReturn {
  /** Execute the shield operation */
  shield: (amount: bigint, to?: `0x${string}`) => Promise<void>;
  /** Current status */
  status: ShieldStatus;
  /** Whether currently processing */
  isPending: boolean;
  /** Whether checking/requesting allowance */
  isApproving: boolean;
  /** Whether wrapping */
  isWrapping: boolean;
  /** Whether operation succeeded */
  isSuccess: boolean;
  /** Whether operation errored */
  isError: boolean;
  /** Error if any */
  error: Error | null;
  /** Transaction hash if available */
  txHash: string | undefined;
  /** Reset state */
  reset: () => void;
  /** Current allowance for wrapper */
  allowance: bigint | undefined;
  /** Refetch allowance */
  refetchAllowance: () => Promise<void>;
}

export interface UseUnshieldOptions {
  /** ERC7984 wrapper contract address */
  wrapperAddress: `0x${string}`;
  /** Callback on successful unshield initiation */
  onSuccess?: (txHash: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseUnshieldReturn {
  /** Execute the unshield operation */
  unshield: (amount: bigint, to?: `0x${string}`) => Promise<void>;
  /** Current status */
  status: UnshieldStatus;
  /** Whether currently processing */
  isPending: boolean;
  /** Whether encrypting the amount */
  isEncrypting: boolean;
  /** Whether signing the transaction */
  isSigning: boolean;
  /** Whether operation succeeded */
  isSuccess: boolean;
  /** Whether operation errored */
  isError: boolean;
  /** Error if any */
  error: Error | null;
  /** Transaction hash if available */
  txHash: string | undefined;
  /** Reset state */
  reset: () => void;
}
```

---

## 3. `useShield` Hook

### Flow

1. **Check allowance** — Read current ERC20 allowance for the wrapper contract
2. **Approve if needed** — If allowance < amount, prompt user to approve
3. **Wrap** — Call `wrapper.wrap(to, amount)`
4. **Confirm** — Wait for transaction confirmation

### Implementation Outline

```typescript
export function useShield(options: UseShieldOptions): UseShieldReturn {
  const { wrapperAddress, underlyingAddress: providedUnderlying, onSuccess, onError } = options;

  const { signer, provider, isReady } = useEthersSigner();
  const { address } = useFhevmContext();

  const [status, setStatus] = useState<ShieldStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [allowance, setAllowance] = useState<bigint | undefined>();
  const [underlyingAddress, setUnderlyingAddress] = useState<`0x${string}` | undefined>(providedUnderlying);

  // Fetch underlying address from wrapper if not provided
  useEffect(() => {
    if (providedUnderlying || !provider || !wrapperAddress) return;
    const wrapper = new ethers.Contract(wrapperAddress, ERC20TOERC7984_ABI, provider);
    wrapper.underlying().then((addr: string) => setUnderlyingAddress(addr as `0x${string}`));
  }, [providedUnderlying, provider, wrapperAddress]);

  // Fetch allowance
  const refetchAllowance = useCallback(async () => {
    if (!provider || !underlyingAddress || !address) return;
    const erc20 = new ethers.Contract(underlyingAddress, ERC20_ABI, provider);
    const allowanceValue = await erc20.allowance(address, wrapperAddress);
    setAllowance(BigInt(allowanceValue));
  }, [provider, underlyingAddress, address, wrapperAddress]);

  useEffect(() => { refetchAllowance(); }, [refetchAllowance]);

  const shield = useCallback(async (amount: bigint, to?: `0x${string}`) => {
    if (!signer || !underlyingAddress || !address) {
      const err = new Error("Not ready");
      setError(err);
      setStatus("error");
      onError?.(err);
      return;
    }

    const recipient = to ?? address;

    try {
      // Step 1: Check allowance
      setStatus("checking-allowance");
      setError(null);

      const erc20 = new ethers.Contract(underlyingAddress, ERC20_ABI, signer);
      const currentAllowance = BigInt(await erc20.allowance(address, wrapperAddress));

      // Step 2: Approve if needed
      if (currentAllowance < amount) {
        setStatus("approving");
        const approveTx = await erc20.approve(wrapperAddress, amount);
        await approveTx.wait();
        await refetchAllowance();
      }

      // Step 3: Wrap
      setStatus("wrapping");
      const wrapper = new ethers.Contract(wrapperAddress, ERC20TOERC7984_ABI, signer);
      const tx = await wrapper.wrap(recipient, amount);
      setTxHash(tx.hash);

      // Step 4: Confirm
      setStatus("confirming");
      const receipt = await tx.wait();
      if (receipt.status === 0) throw new Error("Transaction reverted");

      setStatus("success");
      onSuccess?.(tx.hash);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setStatus("error");
      onError?.(e);
    }
  }, [signer, underlyingAddress, address, wrapperAddress, onSuccess, onError, refetchAllowance]);

  // ... derived state, reset, return
}
```

---

## 4. `useUnshield` Hook

### Flow

1. **Encrypt amount** — Use `useEncrypt` to create encrypted amount handle + proof
2. **Sign & submit** — Call `wrapper.unwrap(from, to, encryptedAmount, inputProof)`
3. **Confirm** — Wait for transaction (note: actual ERC20 release happens in `finalizeUnwrap` called by relayer)

### Implementation Outline

```typescript
export function useUnshield(options: UseUnshieldOptions): UseUnshieldReturn {
  const { wrapperAddress, onSuccess, onError } = options;

  const { status: fhevmStatus, address } = useFhevmContext();
  const { encrypt, isReady: encryptReady } = useEncrypt();
  const { signer, isReady: signerReady } = useEthersSigner();

  const [status, setStatus] = useState<UnshieldStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>();

  const unshield = useCallback(async (amount: bigint, to?: `0x${string}`) => {
    if (fhevmStatus !== "ready" || !encryptReady || !signerReady || !signer || !address) {
      const err = new Error("Not ready");
      setError(err);
      setStatus("error");
      onError?.(err);
      return;
    }

    const recipient = to ?? address;

    try {
      // Step 1: Encrypt
      setStatus("encrypting");
      setError(null);

      const encryptResult = await encrypt(
        [{ type: "uint64", value: amount }],
        wrapperAddress
      );

      if (!encryptResult) throw new Error("Encryption failed");

      const [amountHandle, proof] = encryptResult;

      // Step 2: Sign & submit
      setStatus("signing");
      const wrapper = new ethers.Contract(wrapperAddress, ERC20TOERC7984_ABI, signer);
      const tx = await wrapper.unwrap(address, recipient, amountHandle, proof);
      setTxHash(tx.hash);

      // Step 3: Confirm
      setStatus("confirming");
      const receipt = await tx.wait();
      if (receipt.status === 0) throw new Error("Transaction reverted");

      setStatus("success");
      onSuccess?.(tx.hash);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setStatus("error");
      onError?.(e);
    }
  }, [fhevmStatus, encryptReady, signerReady, signer, address, encrypt, wrapperAddress, onSuccess, onError]);

  // ... derived state, reset, return
}
```

---

## 5. Frontend Page (`app/shield/page.tsx`)

### Features

1. **Token selector** — Dropdown to choose which token pair (TEST1/cTEST1, etc.)
2. **Shield tab** — Input ERC20 amount, show allowance status, execute shield
3. **Unshield tab** — Input amount to unshield, show encrypted balance, execute unshield
4. **Balance displays** — Show both ERC20 balance and confidential balance (decrypted)

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Shield / Unshield Demo                             │
├─────────────────────────────────────────────────────┤
│  Token: [TEST1/cTEST1 ▼]                            │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │ ERC20 Balance    │  │ Confidential Bal │         │
│  │ 1,000 TEST1      │  │ 🔐 ****** cTEST1 │         │
│  │                  │  │ [Decrypt]        │         │
│  └──────────────────┘  └──────────────────┘         │
├─────────────────────────────────────────────────────┤
│  [Shield] [Unshield]                                │
├─────────────────────────────────────────────────────┤
│  Amount: [____________]                             │
│  [🔒 Shield 100 TEST1 → cTEST1]                    │
└─────────────────────────────────────────────────────┘
```

---

## 6. Implementation Order

1. [x] **SDK: ERC20 ABI** — Create `ERC20.ts`, update exports (wrapper ABI already exists)
2. [x] **SDK: Types** — Create `shield.ts` types
3. [x] **SDK: useShield** — Implement shield hook
4. [x] **SDK: useUnshield** — Implement unshield hook
5. [x] **SDK: Exports** — Update `react/index.ts` and `src/index.ts`
6. [x] **Frontend: Token config** — Create `utils/tokens.ts` with registry
7. [x] **Frontend: Page** — Create `app/shield/page.tsx` and `ShieldDemo.tsx`
8. [x] **Build & Test** — `pnpm sdk:build && pnpm check-types`

---

## 7. Notes

### Unwrap Finalization

The `unwrap` call initiates the unwrap but does NOT immediately release ERC20 tokens. The contract emits an event, and a relayer/backend must call `finalizeUnwrap(burntAmount, cleartextAmount, decryptionProof)` to complete the process.

For the demo, we show "Unwrap initiated" as success. The actual ERC20 tokens arrive asynchronously when finalized.

### Decimal Handling

- TEST1/TEST2: 18 decimals

The UI should handle decimal conversion for display. The hooks work with raw bigint amounts.

### Error Handling

- Insufficient ERC20 balance → show error before attempting
- Insufficient confidential balance → contract will revert
- User rejection → detect and show friendly message
