# useConfidentialTransfer

Hook for executing confidential ERC7984 token transfers.

This hook runs the full flow:
1. Encrypt the amount
2. Request wallet signature and submit the transaction
3. Wait for confirmation

## Import

```tsx
import { useConfidentialTransfer } from "fhevm-sdk";
```

## Usage

```tsx
function TransferForm({ tokenAddress }) {
  const {
    transfer,
    status,
    isEncrypting,
    isSigning,
    isConfirming,
    isPending,
    error,
  } = useConfidentialTransfer({
    contractAddress: tokenAddress,
    // Use full signature to avoid overload ambiguity in ethers.
    functionName: "confidentialTransfer(address,bytes32,bytes)",
    onSuccess: (txHash) => {
      console.log("Transfer confirmed:", txHash);
    },
  });

  const handleSubmit = async () => {
    await transfer("0x..." as `0x${string}`, 100n);
  };

  return (
    <button onClick={handleSubmit} disabled={isPending}>
      {isEncrypting
        ? "Encrypting..."
        : isSigning
          ? "Waiting for signature..."
          : isConfirming
            ? "Confirming..."
            : "Transfer"}
    </button>
  );
}
```

## Options

| Option | Type | Description |
| --- | --- | --- |
| `contractAddress` | `` `0x${string}` `` | Target token contract address. |
| `abi` | `ethers.InterfaceAbi` | Optional custom ABI (defaults to ERC7984 ABI). |
| `functionName` | `string` | Contract function name or full signature (default: `confidentialTransfer(address,bytes32,bytes)`). |
| `onSuccess` | `(txHash: string) => void` | Called after confirmation. |
| `onError` | `(error: Error) => void` | Called on any failure. |

## Returns

| Property | Type | Description |
| --- | --- | --- |
| `transfer` | `(to, amount) => Promise<void>` | Executes transfer flow. |
| `status` | `"idle" \| "encrypting" \| "signing" \| "confirming" \| "success" \| "error"` | Current transfer status. |
| `isEncrypting` | `boolean` | True during encryption. |
| `isSigning` | `boolean` | True while waiting for wallet signature. |
| `isConfirming` | `boolean` | True while waiting for confirmation. |
| `isPending` | `boolean` | True whenever a step is running. |
| `isSuccess` | `boolean` | True after successful confirmation. |
| `isError` | `boolean` | True if a step failed. |
| `error` | `Error \| null` | Error details when `status` is `error`. |
| `txHash` | `string \| undefined` | Transaction hash after signing. |
| `reset` | `() => void` | Reset internal state to idle. |

## Notes

- ERC7984 defines overloads for `confidentialTransfer`. When using ethers, pass the full signature to avoid ambiguity.
- `transfer` throws on error so callers can surface failures immediately.
