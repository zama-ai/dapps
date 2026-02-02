"use client";

import { useCallback, useMemo } from "react";
import { useFhevmContext } from "./context";
import type { RelayerEncryptedInput } from "@zama-fhe/relayer-sdk/web";
import type {
  EncryptInput,
  EncryptResult,
  EncryptedOutput,
  FheTypeName,
} from "../types/encryption";

// Re-export types for convenience
export type { EncryptInput, EncryptResult, EncryptedOutput, FheTypeName };

/**
 * Return type for useEncrypt hook.
 */
export interface UseEncryptReturn {
  /**
   * Whether encryption is ready.
   * False if FHEVM is not initialized or wallet not connected.
   */
  isReady: boolean;

  /**
   * Encrypt values for FHE contract calls.
   *
   * Returns a tuple of `[...handles, proof]` for easy destructuring.
   *
   * @param inputs - Array of typed values to encrypt
   * @param contractAddress - Target contract address
   * @returns Tuple of handles followed by proof, or undefined if not ready
   *
   * @example
   * ```ts
   * // Single value
   * const [amountHandle, proof] = await encrypt([
   *   { type: 'uint64', value: 100n },
   * ], contractAddress);
   *
   * // Multiple values
   * const [amountHandle, recipientHandle, proof] = await encrypt([
   *   { type: 'uint64', value: 100n },
   *   { type: 'address', value: '0x...' },
   * ], contractAddress);
   *
   * // Use in contract call
   * writeContract({
   *   args: [amountHandle, recipientHandle, proof],
   * });
   * ```
   */
  encrypt: <T extends readonly EncryptInput[]>(
    inputs: T,
    contractAddress: `0x${string}`
  ) => Promise<EncryptResult<T> | undefined>;
}

/**
 * Map FHE type name to the builder method on RelayerEncryptedInput.
 * @internal
 */
const typeToBuilderMethod: Record<FheTypeName, keyof RelayerEncryptedInput> = {
  bool: "addBool",
  uint8: "add8",
  uint16: "add16",
  uint32: "add32",
  uint64: "add64",
  uint128: "add128",
  uint256: "add256",
  address: "addAddress",
};

/**
 * Add a value to the encryption builder based on its type.
 * @internal
 */
function addToBuilder(
  builder: RelayerEncryptedInput,
  input: EncryptInput
): void {
  const method = typeToBuilderMethod[input.type];
  (builder[method] as (value: unknown) => void)(input.value);
}

/**
 * Hook for encrypting values for FHE contract calls.
 *
 * Provides type-safe encryption with compile-time checking of value types.
 * Returns a tuple for easy destructuring into handles and proof.
 *
 * @example
 * ```tsx
 * function TransferForm({ contractAddress }) {
 *   const { encrypt, isReady } = useEncrypt();
 *
 *   const handleTransfer = async (amount: bigint, recipient: `0x${string}`) => {
 *     if (!isReady) return;
 *
 *     const [amountHandle, recipientHandle, proof] = await encrypt([
 *       { type: 'uint64', value: amount },
 *       { type: 'address', value: recipient },
 *     ], contractAddress);
 *
 *     if (!amountHandle) return;
 *
 *     writeContract({
 *       address: contractAddress,
 *       abi: tokenAbi,
 *       functionName: 'transfer',
 *       args: [amountHandle, recipientHandle, proof],
 *     });
 *   };
 *
 *   return (
 *     <button onClick={() => handleTransfer(100n, '0x...')} disabled={!isReady}>
 *       Transfer
 *     </button>
 *   );
 * }
 * ```
 */
export function useEncrypt(): UseEncryptReturn {
  const { instance, status, address } = useFhevmContext();

  const isReady = useMemo(
    () => status === "ready" && instance !== undefined && address !== undefined,
    [status, instance, address]
  );

  const encrypt = useCallback(
    async <T extends readonly EncryptInput[]>(
      inputs: T,
      contractAddress: `0x${string}`
    ): Promise<EncryptResult<T> | undefined> => {
      if (!instance || !address) return undefined;

      const builder = instance.createEncryptedInput(
        contractAddress,
        address
      ) as RelayerEncryptedInput;

      // Add each input to the builder
      for (const input of inputs) {
        addToBuilder(builder, input);
      }

      // Encrypt and get result
      const result: EncryptedOutput = await builder.encrypt();

      // Return as tuple: [...handles, proof]
      // Cast through unknown to satisfy TypeScript's strict tuple checking
      return [...result.handles, result.inputProof] as unknown as EncryptResult<T>;
    },
    [instance, address]
  );

  return {
    isReady,
    encrypt,
  };
}
