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

  const handleTransfer = async (amount: bigint, recipient: `0x${string}`) => {
    if (!isReady) return;

    // Encrypt values - returns [handle1, handle2, ..., proof]
    const [amountHandle, recipientHandle, proof] = await encrypt([
      { type: "uint64", value: amount },
      { type: "address", value: recipient },
    ], contractAddress);

    if (!amountHandle) return;

    // Use directly in contract call
    writeContract({
      address: contractAddress,
      abi: tokenAbi,
      functionName: "transfer",
      args: [amountHandle, recipientHandle, proof],
    });
  };
}
```

## Returns

| Property  | Type                                                      | Description                 |
| --------- | --------------------------------------------------------- | --------------------------- |
| `isReady` | `boolean`                                                 | Whether encryption is ready |
| `encrypt` | `(inputs, contract) => Promise<[...handles, proof]>` | Encrypt values              |

## encrypt()

Encrypts one or more values and returns a tuple of `[...handles, proof]` for easy destructuring.

### Signature

```tsx
encrypt<T extends EncryptInput[]>(
  inputs: T,
  contractAddress: `0x${string}`
): Promise<EncryptResult<T> | undefined>
```

### Single Value

```tsx
const [amountHandle, proof] = await encrypt([
  { type: "uint64", value: 100n },
], contractAddress);
```

### Multiple Values

```tsx
const [amountHandle, feeHandle, recipientHandle, proof] = await encrypt([
  { type: "uint64", value: amount },
  { type: "uint64", value: fee },
  { type: "address", value: recipient },
], contractAddress);
```

## EncryptInput

Type-safe input with compile-time checking:

```tsx
type EncryptInput =
  | { type: "bool"; value: boolean }
  | { type: "uint8"; value: number }
  | { type: "uint16"; value: number }
  | { type: "uint32"; value: number }
  | { type: "uint64"; value: bigint }
  | { type: "uint128"; value: bigint }
  | { type: "uint256"; value: bigint }
  | { type: "address"; value: `0x${string}` };
```

### Type Safety

TypeScript enforces correct value types at compile time:

```tsx
// Valid - bigint for uint64
encrypt([{ type: "uint64", value: 100n }], contract);

// TypeScript Error - number not assignable to bigint
encrypt([{ type: "uint64", value: 100 }], contract);

// TypeScript Error - number not assignable to boolean
encrypt([{ type: "bool", value: 1 }], contract);

// TypeScript Error - string not assignable to `0x${string}`
encrypt([{ type: "address", value: "notHex" }], contract);
```

### Supported Types

| Type      | TypeScript Value Type | Example                    |
| --------- | --------------------- | -------------------------- |
| `bool`    | `boolean`             | `{ type: "bool", value: true }` |
| `uint8`   | `number`              | `{ type: "uint8", value: 255 }` |
| `uint16`  | `number`              | `{ type: "uint16", value: 65535 }` |
| `uint32`  | `number`              | `{ type: "uint32", value: 4294967295 }` |
| `uint64`  | `bigint`              | `{ type: "uint64", value: 100n }` |
| `uint128` | `bigint`              | `{ type: "uint128", value: 100n }` |
| `uint256` | `bigint`              | `{ type: "uint256", value: 100n }` |
| `address` | `` `0x${string}` ``   | `{ type: "address", value: "0x..." }` |

## Complete Example

```tsx
import { useEncrypt } from "fhevm-sdk";
import { useWriteContract } from "wagmi";

function ConfidentialTransfer({ contractAddress, tokenAbi }) {
  const { encrypt, isReady } = useEncrypt();
  const { writeContract, isPending } = useWriteContract();

  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  const handleTransfer = async () => {
    if (!isReady) return;

    // Encrypt amount and recipient
    const [amountHandle, recipientHandle, proof] = await encrypt([
      { type: "uint64", value: BigInt(amount) },
      { type: "address", value: recipient as `0x${string}` },
    ], contractAddress);

    if (!amountHandle) {
      console.error("Encryption failed");
      return;
    }

    // Call contract with encrypted values
    writeContract({
      address: contractAddress,
      abi: tokenAbi,
      functionName: "confidentialTransfer",
      args: [amountHandle, recipientHandle, proof],
    });
  };

  return (
    <div>
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        type="text"
        placeholder="Recipient address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <button
        onClick={handleTransfer}
        disabled={!isReady || isPending}
      >
        {isPending ? "Transferring..." : "Transfer"}
      </button>
    </div>
  );
}
```

## Migration from Old API

If you were using the previous API:

```tsx
// Old API
const encrypted = await encrypt(100n, contractAddress);
writeContract({ args: [encrypted.handles[0], encrypted.inputProof] });

// New API
const [handle, proof] = await encrypt([
  { type: "uint64", value: 100n }
], contractAddress);
writeContract({ args: [handle, proof] });
```

Multiple values:

```tsx
// Old API
const encrypted = await encryptBatch([
  { type: "uint64", value: 100n },
  { type: "address", value: "0x..." },
], contractAddress);
writeContract({ args: [encrypted.handles[0], encrypted.handles[1], encrypted.inputProof] });

// New API
const [amount, recipient, proof] = await encrypt([
  { type: "uint64", value: 100n },
  { type: "address", value: "0x..." },
], contractAddress);
writeContract({ args: [amount, recipient, proof] });
```
