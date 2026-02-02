# Confidential Transfer Hook

## Goal

Create a reusable `useConfidentialTransfer` hook that encapsulates the full flow of transferring confidential ERC7984 tokens, including encryption, signing, and transaction confirmation.

## Current Flow (Manual)

Currently in `useERC7984Wagmi.tsx`, the transfer flow is:

```typescript
const transferTokens = async (to: string, amount: number) => {
  // 1. Encrypt amount
  const [amountHandle, proof] = await encrypt([
    { type: "uint64", value: BigInt(amount) }
  ], contractAddress);

  // 2. Get contract and call confidentialTransfer
  const contract = new ethers.Contract(address, abi, signer);
  const tx = await contract.confidentialTransfer(to, amountHandle, proof);

  // 3. Wait for confirmation
  await tx.wait();
};
```

## Proposed Hook API

```typescript
const {
  transfer,           // (to: string, amount: bigint) => Promise<void>
  isEncrypting,       // boolean
  isSigning,          // boolean
  isConfirming,       // boolean
  isSuccess,          // boolean
  isError,            // boolean
  error,              // Error | null
  status,             // 'idle' | 'encrypting' | 'signing' | 'confirming' | 'success' | 'error'
  txHash,             // string | undefined
  reset,              // () => void
} = useConfidentialTransfer({
  contractAddress: `0x${string}`,
  abi?: Abi,                        // Optional - uses default ERC7984 ABI if not provided
  functionName?: string,            // Default: "confidentialTransfer"
  onSuccess?: (txHash: string) => void,
  onError?: (error: Error) => void,
});
```

## Implementation Plan

### 1. Create the Hook File

Location: `packages/fhevm-sdk/src/react/useConfidentialTransfer.ts`

### 2. Dependencies

- `useEncrypt` - For encrypting the amount
- `useFhevmContext` - For instance and provider access
- `useMutation` from TanStack Query - For state management
- `wagmi` - For `useWriteContract` or direct ethers contract calls

### 3. Hook Structure

```typescript
export interface UseConfidentialTransferOptions {
  contractAddress: `0x${string}`;
  abi?: Abi;
  functionName?: string;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export type TransferStatus =
  | 'idle'
  | 'encrypting'
  | 'signing'
  | 'confirming'
  | 'success'
  | 'error';

export interface UseConfidentialTransferReturn {
  transfer: (to: `0x${string}`, amount: bigint) => Promise<void>;
  status: TransferStatus;
  isEncrypting: boolean;
  isSigning: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  isPending: boolean;
  error: Error | null;
  txHash: string | undefined;
  reset: () => void;
}
```

### 4. Internal Flow

```
transfer(to, amount) called
        ↓
status = 'encrypting'
        ↓
encrypt([{ type: "uint64", value: amount }], contractAddress)
        ↓
status = 'signing'
        ↓
writeContract({ functionName: "confidentialTransfer", args: [to, handle, proof] })
        ↓
status = 'confirming'
        ↓
wait for transaction receipt
        ↓
status = 'success' (or 'error' if failed)
```

### 5. Integration Options

**Option A: Use wagmi's useWriteContract**
- Pros: Works with wagmi ecosystem, handles wallet interaction
- Cons: Requires wagmi dependency

**Option B: Use ethers directly via useEthersSigner**
- Pros: Works without wagmi
- Cons: More manual setup

**Option C: Use EIP-1193 provider directly**
- Pros: No ethers dependency
- Cons: Need to handle transaction encoding manually

**Recommendation: Option A** - Use wagmi's `useWriteContract` since the SDK is already designed to work with wagmi.

### 6. Default ABI

Use the ERC7984 ABI with both `confidentialTransfer` overloads:

```typescript
// For transfers with encrypted input + proof (user-initiated)
{
  name: "confidentialTransfer",
  type: "function",
  inputs: [
    { name: "to", type: "address" },
    { name: "encryptedAmount", type: "bytes32" },  // externalEuint64
    { name: "inputProof", type: "bytes" }
  ],
  outputs: [{ name: "", type: "bytes32" }],  // returns euint64
  stateMutability: "nonpayable"
}

// For transfers with already-encrypted amount (contract-to-contract)
{
  name: "confidentialTransfer",
  type: "function",
  inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "bytes32" }  // euint64
  ],
  outputs: [{ name: "", type: "bytes32" }],
  stateMutability: "nonpayable"
}
```

The hook will use the first overload (with `inputProof`) since it encrypts the amount client-side.

### 7. Error Handling

- Encryption failures
- User rejection (wallet)
- Transaction revert
- Network errors
- Invalid addresses

### 8. Export from SDK

Add to `packages/fhevm-sdk/src/react/index.ts`:
```typescript
export * from "./useConfidentialTransfer";
```

## Usage Example

```tsx
import { useConfidentialTransfer } from "fhevm-sdk";

function TransferForm({ tokenAddress }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");

  const {
    transfer,
    status,
    isEncrypting,
    isPending,
    error
  } = useConfidentialTransfer({
    contractAddress: tokenAddress,
    onSuccess: (hash) => {
      console.log("Transfer successful:", hash);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await transfer(to as `0x${string}`, BigInt(amount));
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={to} onChange={e => setTo(e.target.value)} placeholder="Recipient" />
      <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
      <button disabled={isPending}>
        {isEncrypting ? "Encrypting..." : isPending ? "Transferring..." : "Transfer"}
      </button>
      {error && <p>{error.message}</p>}
    </form>
  );
}
```

## Testing Considerations

1. Mock the encrypt function
2. Mock the contract write
3. Test each status transition
4. Test error scenarios
5. Test reset functionality

## Future Enhancements

- Support for batch transfers
- Gas estimation
- Custom encryption types (not just uint64)
- Support for other confidential operations (approve, transferFrom)
