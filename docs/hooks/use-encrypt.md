# useEncrypt

Hook for encrypting values for FHE contract calls.

## Import

```tsx
import { useEncrypt } from "fhevm-sdk";
```

## Usage

```tsx
function TransferForm({ contractAddress }) {
  const { encrypt, isReady } = useEncrypt();

  const handleTransfer = async (amount: bigint) => {
    if (!isReady) return;

    const encrypted = await encrypt(amount, contractAddress);
    if (!encrypted) return;

    // Use encrypted.handles[0] and encrypted.inputProof
  };
}
```

## Returns

| Property       | Type                                               | Description                     |
| -------------- | -------------------------------------------------- | ------------------------------- |
| `isReady`      | `boolean`                                          | Whether encryption is ready     |
| `encrypt`      | `(value, contract) => Promise<EncryptedInput>`     | Encrypt a single value          |
| `encryptBatch` | `(inputs[], contract) => Promise<EncryptedInput>`  | Encrypt multiple values         |
| `encryptWith`  | `(contract, buildFn) => Promise<EncryptedInput>`   | Builder pattern for advanced use |
| `mutation`     | `EncryptMutationState`                             | TanStack Query mutation state   |

## encrypt()

Encrypt a single value. Supports two calling patterns:

### Simple Pattern (Recommended)

Defaults to `uint64`:

```tsx
const encrypted = await encrypt(100n, contractAddress);
```

### With Explicit Type

```tsx
const encrypted = await encrypt("uint128", 100n, contractAddress);
const encrypted = await encrypt("bool", true, contractAddress);
const encrypted = await encrypt("address", "0x...", contractAddress);
```

## encryptBatch()

Encrypt multiple values in a single operation:

```tsx
const encrypted = await encryptBatch(
  [
    { type: "uint64", value: 100n },
    { type: "uint64", value: 200n },
    { type: "address", value: recipientAddress },
  ],
  contractAddress
);

// Use encrypted.handles[0], encrypted.handles[1], etc.
```

## encryptWith()

Builder pattern for full control:

```tsx
const encrypted = await encryptWith(contractAddress, (builder) => {
  builder.add64(100n);
  builder.add64(200n);
  builder.addAddress(recipientAddress);
});
```

### Builder Methods

| Type      | Method         | Value Type          |
| --------- | -------------- | ------------------- |
| `bool`    | `addBool()`    | `boolean`           |
| `uint8`   | `add8()`       | `number \| bigint`  |
| `uint16`  | `add16()`      | `number \| bigint`  |
| `uint32`  | `add32()`      | `number \| bigint`  |
| `uint64`  | `add64()`      | `number \| bigint`  |
| `uint128` | `add128()`     | `bigint`            |
| `uint256` | `add256()`     | `bigint`            |
| `address` | `addAddress()` | `` `0x${string}` `` |

## mutation

TanStack Query mutation for reactive state:

```tsx
function TransferForm({ contractAddress }) {
  const { mutation, isReady } = useEncrypt();

  const handleSubmit = () => {
    mutation.mutate({
      type: "uint64",
      value: 100n,
      contractAddress,
    });
  };

  return (
    <div>
      <button onClick={handleSubmit} disabled={!isReady || mutation.isPending}>
        {mutation.isPending ? "Encrypting..." : "Encrypt"}
      </button>
      {mutation.isError && <p>Error: {mutation.error?.message}</p>}
      {mutation.isSuccess && <p>Encrypted!</p>}
    </div>
  );
}
```

### Mutation State

| Property      | Type                        | Description              |
| ------------- | --------------------------- | ------------------------ |
| `mutate`      | `(params) => void`          | Trigger encryption       |
| `mutateAsync` | `(params) => Promise<...>`  | Async trigger            |
| `isPending`   | `boolean`                   | Whether in progress      |
| `isSuccess`   | `boolean`                   | Whether succeeded        |
| `isError`     | `boolean`                   | Whether failed           |
| `isIdle`      | `boolean`                   | Whether not started      |
| `error`       | `Error \| null`             | Error if failed          |
| `data`        | `EncryptedInput \| undefined` | Result if succeeded    |
| `reset`       | `() => void`                | Reset state              |

## EncryptedInput

The encryption result:

```tsx
type EncryptedInput = {
  handles: Uint8Array[]; // Encrypted handles for contract
  inputProof: Uint8Array; // Proof for the encrypted input
};
```

## Example: Contract Call

```tsx
import { useEncrypt } from "fhevm-sdk";
import { useWriteContract } from "wagmi";

function Transfer({ contractAddress, recipient }) {
  const { encrypt, isReady } = useEncrypt();
  const { writeContract } = useWriteContract();

  const handleTransfer = async (amount: bigint) => {
    const encrypted = await encrypt(amount, contractAddress);
    if (!encrypted) return;

    await writeContract({
      address: contractAddress,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient, encrypted.handles[0], encrypted.inputProof],
    });
  };
}
```
