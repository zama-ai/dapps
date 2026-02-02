/**
 * FHE Encryption Types
 *
 * Type-safe definitions for encrypting values in FHE contracts.
 * Uses discriminated unions to enforce correct value types at compile time.
 */

/**
 * Supported FHE type names (Solidity-style naming).
 * Maps to relayer-sdk internal types: ebool, euint8, euint16, euint32, euint64, euint128, euint256, eaddress
 */
export type FheTypeName =
  | "bool"
  | "uint8"
  | "uint16"
  | "uint32"
  | "uint64"
  | "uint128"
  | "uint256"
  | "address";

/**
 * Map FHE type name to the expected TypeScript value type.
 */
export type FheValueType<T extends FheTypeName> = T extends "bool"
  ? boolean
  : T extends "uint8" | "uint16" | "uint32"
    ? number
    : T extends "uint64" | "uint128" | "uint256"
      ? bigint
      : T extends "address"
        ? `0x${string}`
        : never;

/**
 * Discriminated union for type-safe encryption inputs.
 *
 * TypeScript enforces correct value types based on the `type` field:
 * - `bool` requires `boolean`
 * - `uint8`, `uint16`, `uint32` require `number`
 * - `uint64`, `uint128`, `uint256` require `bigint`
 * - `address` requires `0x${string}`
 *
 * @example
 * ```ts
 * // Valid inputs
 * const inputs: EncryptInput[] = [
 *   { type: 'bool', value: true },
 *   { type: 'uint8', value: 255 },
 *   { type: 'uint64', value: 100n },
 *   { type: 'address', value: '0x1234...' },
 * ];
 *
 * // TypeScript errors at compile time:
 * { type: 'uint64', value: 100 }    // Error: number not assignable to bigint
 * { type: 'bool', value: 1 }         // Error: number not assignable to boolean
 * { type: 'address', value: 'bad' }  // Error: string not assignable to `0x${string}`
 * ```
 */
export type EncryptInput =
  | { type: "bool"; value: boolean }
  | { type: "uint8"; value: number }
  | { type: "uint16"; value: number }
  | { type: "uint32"; value: number }
  | { type: "uint64"; value: bigint }
  | { type: "uint128"; value: bigint }
  | { type: "uint256"; value: bigint }
  | { type: "address"; value: `0x${string}` };

/**
 * Result type for encrypt function.
 * Returns a tuple of [...handles, proof] for easy destructuring.
 *
 * @example
 * ```ts
 * const [amountHandle, recipientHandle, proof] = await encrypt([
 *   { type: 'uint64', value: 100n },
 *   { type: 'address', value: '0x...' },
 * ], contractAddress);
 * ```
 */
export type EncryptResult<T extends readonly EncryptInput[]> = readonly [
  ...{ [K in keyof T]: Uint8Array },
  Uint8Array,
];

/**
 * Encrypted output containing handles and proof.
 */
export type EncryptedOutput = {
  /** Encrypted handles to pass to contract */
  handles: Uint8Array[];
  /** Proof for the encrypted input */
  inputProof: Uint8Array;
};
