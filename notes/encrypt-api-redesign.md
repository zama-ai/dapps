# Encrypt API Redesign Plan

## Goal

Redesign `useEncrypt` to have a cleaner, type-safe API:

```ts
const [amountHandle, recipientHandle, proof] = await encrypt([
  { type: 'uint64', value: 123n },
  { type: 'address', value: '0x...' },
], contractAddress);
```

## Requirements

1. **Destructurable return** - Returns tuple `[...handles, proof]` for easy destructuring
2. **Object-based inputs** - `{ type: 'uint64', value: 123n }` syntax
3. **Compile-time type checking** - TypeScript enforces correct value types per FHE type
4. **Match relayer-sdk types** - Based on: `ebool`, `euint8`, `euint16`, `euint32`, `euint64`, `euint128`, `euint256`, `eaddress`

## Type Definitions

### File: `src/types/encryption.ts`

```ts
// FHE type names (matching relayer-sdk internally, but using Solidity-style externally)
export type FheTypeName =
  | 'bool'
  | 'uint8'
  | 'uint16'
  | 'uint32'
  | 'uint64'
  | 'uint128'
  | 'uint256'
  | 'address';

// Map FHE type to the expected TypeScript value type
export type FheValueType<T extends FheTypeName> =
  T extends 'bool' ? boolean :
  T extends 'uint8' | 'uint16' | 'uint32' ? number :
  T extends 'uint64' | 'uint128' | 'uint256' ? bigint :
  T extends 'address' ? `0x${string}` :
  never;

// Discriminated union for type-safe inputs
export type EncryptInput =
  | { type: 'bool'; value: boolean }
  | { type: 'uint8'; value: number }
  | { type: 'uint16'; value: number }
  | { type: 'uint32'; value: number }
  | { type: 'uint64'; value: bigint }
  | { type: 'uint128'; value: bigint }
  | { type: 'uint256'; value: bigint }
  | { type: 'address'; value: `0x${string}` };

// Result tuple type - handles followed by proof
export type EncryptResult<T extends readonly EncryptInput[]> =
  readonly [...{ [K in keyof T]: Uint8Array }, Uint8Array];
```

### Compile-Time Checks

With discriminated unions, TypeScript will enforce:

```ts
// ✓ Correct - bigint for uint64
encrypt([{ type: 'uint64', value: 123n }], contract)

// ✗ Error - number not assignable to bigint
encrypt([{ type: 'uint64', value: 123 }], contract)

// ✗ Error - string not assignable to boolean
encrypt([{ type: 'bool', value: 'true' }], contract)

// ✓ Correct - hex string for address
encrypt([{ type: 'address', value: '0x1234...' }], contract)
```

## Implementation

### File: `src/react/useEncrypt.ts`

```ts
export function useEncrypt() {
  // ... existing setup ...

  const encrypt = useCallback(
    async <T extends readonly EncryptInput[]>(
      inputs: T,
      contractAddress: `0x${string}`
    ): Promise<EncryptResult<T> | undefined> => {
      if (!instance || !address) return undefined;

      const builder = instance.createEncryptedInput(contractAddress, address);

      // Add each input to builder
      for (const input of inputs) {
        addToBuilder(builder, input);
      }

      const result = await builder.encrypt();

      // Return as tuple: [...handles, proof]
      return [...result.handles, result.inputProof] as EncryptResult<T>;
    },
    [instance, address]
  );

  return { encrypt, isReady };
}

// Internal helper to add value to builder based on type
function addToBuilder(builder: RelayerEncryptedInput, input: EncryptInput): void {
  switch (input.type) {
    case 'bool': builder.addBool(input.value); break;
    case 'uint8': builder.add8(input.value); break;
    case 'uint16': builder.add16(input.value); break;
    case 'uint32': builder.add32(input.value); break;
    case 'uint64': builder.add64(input.value); break;
    case 'uint128': builder.add128(input.value); break;
    case 'uint256': builder.add256(input.value); break;
    case 'address': builder.addAddress(input.value); break;
  }
}
```

## Usage Examples

### Basic Usage

```ts
const { encrypt, isReady } = useEncrypt();

const [amountHandle, proof] = await encrypt([
  { type: 'uint64', value: 100n },
], contractAddress);

writeContract({
  args: [recipient, amountHandle, proof],
});
```

### Multiple Values

```ts
const [amountHandle, feeHandle, recipientHandle, proof] = await encrypt([
  { type: 'uint64', value: amount },
  { type: 'uint64', value: fee },
  { type: 'address', value: recipient },
], contractAddress);

writeContract({
  args: [amountHandle, feeHandle, recipientHandle, proof],
});
```

### With Type Safety

```ts
// This will show TypeScript errors at compile time:
encrypt([
  { type: 'uint64', value: 100 },    // Error: number not assignable to bigint
  { type: 'bool', value: 1 },         // Error: number not assignable to boolean
  { type: 'address', value: 'bad' },  // Error: string not assignable to `0x${string}`
], contractAddress);
```

## Files to Modify

| File | Action |
|------|--------|
| `src/types/encryption.ts` | Create new file with type definitions |
| `src/react/useEncrypt.ts` | Update to use new types and return tuple |
| `src/index.ts` | Export new types |
| `docs/hooks/use-encrypt.md` | Update documentation |

## Migration

The old API can be deprecated but kept for backwards compatibility:

```ts
// Old API (deprecated)
const encrypted = await encrypt(100n, contractAddress);
encrypted.handles[0], encrypted.inputProof

// New API
const [handle, proof] = await encrypt([
  { type: 'uint64', value: 100n }
], contractAddress);
```

## Questions to Resolve

1. Should we keep the old `encrypt(value, contract)` shorthand for single values?
2. Should we support `encryptBatch` as alias or just use `encrypt` for both?
3. Should we add runtime validation in addition to compile-time checks?
