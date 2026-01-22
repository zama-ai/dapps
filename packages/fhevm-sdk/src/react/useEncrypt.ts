"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useFhevmContext } from "./context";
import { fhevmKeys } from "./queryKeys";
import type { RelayerEncryptedInput } from "@zama-fhe/relayer-sdk/web";

/**
 * Result from an encryption operation.
 */
export type EncryptedInput = {
  /** Encrypted handles to pass to contract */
  handles: Uint8Array[];
  /** Proof for the encrypted input */
  inputProof: Uint8Array;
};

/**
 * Supported encrypted types and their builder methods.
 */
export type EncryptableType =
  | "bool"
  | "uint8"
  | "uint16"
  | "uint32"
  | "uint64"
  | "uint128"
  | "uint256"
  | "address";

/**
 * Input for batch encryption.
 */
export interface EncryptInput {
  /** Type of the value */
  type: EncryptableType;
  /** Value to encrypt */
  value: boolean | number | bigint | string;
}

/**
 * Parameters for encryption mutation.
 */
export interface EncryptMutationParams {
  /** Type of value to encrypt (defaults to 'uint64' if not specified) */
  type?: EncryptableType;
  /** Value to encrypt */
  value: boolean | number | bigint | string;
  /** Target contract address */
  contractAddress: `0x${string}`;
}

/**
 * Mutation state for encryption operations.
 */
export interface EncryptMutationState {
  /** Trigger encryption with mutation tracking (type defaults to uint64) */
  mutate: (params: EncryptMutationParams) => void;

  /** Trigger encryption and return promise (type defaults to uint64) */
  mutateAsync: (params: EncryptMutationParams) => Promise<EncryptedInput>;

  /** Whether mutation is in progress */
  isPending: boolean;

  /** Whether mutation succeeded */
  isSuccess: boolean;

  /** Whether mutation failed */
  isError: boolean;

  /** Whether mutation is idle (not started) */
  isIdle: boolean;

  /** Error if mutation failed */
  error: Error | null;

  /** Result data if mutation succeeded */
  data: EncryptedInput | undefined;

  /** Reset mutation state */
  reset: () => void;
}

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
   * Encrypt a single value.
   *
   * Supports two calling patterns:
   * - `encrypt(value, contractAddress)` - defaults to uint64
   * - `encrypt(type, value, contractAddress)` - explicit type
   *
   * @param typeOrValue - Either the type ('uint64', 'uint128', etc.) or the value to encrypt
   * @param valueOrContract - Either the value (if type provided) or the contract address
   * @param contractAddress - Contract address (only if type was provided)
   * @returns Encrypted handles and proof
   *
   * @example
   * ```ts
   * // Simple - type defaults to uint64
   * const encrypted = await encrypt(100n, '0x...')
   *
   * // With explicit type
   * const encrypted = await encrypt('uint128', 100n, '0x...')
   * ```
   */
  encrypt: {
    // Simple: encrypt(value, contractAddress) - defaults to uint64
    (value: number | bigint, contractAddress: `0x${string}`): Promise<EncryptedInput | undefined>;
    // With type: encrypt(type, value, contractAddress)
    (type: EncryptableType, value: boolean | number | bigint | string, contractAddress: `0x${string}`): Promise<EncryptedInput | undefined>;
  };

  /**
   * Encrypt multiple values in a batch.
   *
   * @param inputs - Array of values to encrypt
   * @param contractAddress - Target contract address
   * @returns Encrypted handles and proof
   *
   * @example
   * ```ts
   * const encrypted = await encryptBatch([
   *   { type: 'uint64', value: 100n },
   *   { type: 'address', value: '0x...' }
   * ], '0x...')
   * ```
   */
  encryptBatch: (
    inputs: EncryptInput[],
    contractAddress: `0x${string}`
  ) => Promise<EncryptedInput | undefined>;

  /**
   * Low-level encryption with builder function.
   * Use this for full control over the encryption process.
   *
   * @param contractAddress - Target contract address
   * @param buildFn - Function to build the encrypted input
   * @returns Encrypted handles and proof
   *
   * @example
   * ```ts
   * const encrypted = await encryptWith('0x...', (builder) => {
   *   builder.add64(100n)
   *   builder.addAddress('0x...')
   * })
   * ```
   */
  encryptWith: (
    contractAddress: `0x${string}`,
    buildFn: (builder: RelayerEncryptedInput) => void
  ) => Promise<EncryptedInput | undefined>;

  /**
   * TanStack Query mutation for encryption with automatic state tracking.
   *
   * Use this for reactive state management instead of the async functions.
   *
   * @example
   * ```tsx
   * function TransferForm() {
   *   const { mutation, isReady } = useEncrypt()
   *
   *   const handleSubmit = () => {
   *     mutation.mutate({
   *       type: 'uint64',
   *       value: 100n,
   *       contractAddress: '0x...'
   *     })
   *   }
   *
   *   return (
   *     <div>
   *       <button onClick={handleSubmit} disabled={!isReady || mutation.isPending}>
   *         {mutation.isPending ? 'Encrypting...' : 'Encrypt'}
   *       </button>
   *       {mutation.isError && <p>Error: {mutation.error?.message}</p>}
   *       {mutation.isSuccess && <p>Encrypted!</p>}
   *     </div>
   *   )
   * }
   * ```
   */
  mutation: EncryptMutationState;
}

/**
 * Get the builder method name for an encryptable type.
 * @internal
 */
function getBuilderMethod(type: EncryptableType): keyof RelayerEncryptedInput {
  switch (type) {
    case "bool":
      return "addBool";
    case "uint8":
      return "add8";
    case "uint16":
      return "add16";
    case "uint32":
      return "add32";
    case "uint64":
      return "add64";
    case "uint128":
      return "add128";
    case "uint256":
      return "add256";
    case "address":
      return "addAddress";
  }
}

/**
 * Hook for encrypting values for FHE contract calls.
 *
 * Uses the FHEVM instance from context, so no need to pass it manually.
 *
 * @example
 * ```tsx
 * function TransferForm() {
 *   const { encrypt, isReady } = useEncrypt()
 *
 *   const handleTransfer = async () => {
 *     if (!isReady) return
 *
 *     const encrypted = await encrypt('uint64', amount, contractAddress)
 *     if (!encrypted) return
 *
 *     // Use encrypted.handles[0] and encrypted.inputProof in contract call
 *   }
 * }
 * ```
 */
export function useEncrypt(): UseEncryptReturn {
  const { instance, status, address, chainId } = useFhevmContext();

  const isReady = useMemo(
    () => status === "ready" && instance !== undefined && address !== undefined,
    [status, instance, address]
  );

  const encryptWith = useCallback(
    async (
      contractAddress: `0x${string}`,
      buildFn: (builder: RelayerEncryptedInput) => void
    ): Promise<EncryptedInput | undefined> => {
      if (!instance || !address) return undefined;

      const input = instance.createEncryptedInput(
        contractAddress,
        address
      ) as RelayerEncryptedInput;

      buildFn(input);

      const result = await input.encrypt();
      return result;
    },
    [instance, address]
  );

  // Encrypt function with overloads:
  // - encrypt(value, contractAddress) - defaults to uint64
  // - encrypt(type, value, contractAddress) - explicit type
  const encrypt = useCallback(
    async (
      typeOrValue: EncryptableType | boolean | number | bigint | string,
      valueOrContract: boolean | number | bigint | string | `0x${string}`,
      maybeContract?: `0x${string}`
    ): Promise<EncryptedInput | undefined> => {
      // Determine which overload was used
      let type: EncryptableType;
      let value: boolean | number | bigint | string;
      let contractAddress: `0x${string}`;

      // Check if first arg is an EncryptableType (string matching our types)
      const encryptableTypes: EncryptableType[] = ["bool", "uint8", "uint16", "uint32", "uint64", "uint128", "uint256", "address"];
      if (typeof typeOrValue === "string" && encryptableTypes.includes(typeOrValue as EncryptableType)) {
        // Pattern: encrypt(type, value, contractAddress)
        type = typeOrValue as EncryptableType;
        value = valueOrContract;
        contractAddress = maybeContract!;
      } else {
        // Pattern: encrypt(value, contractAddress) - default to uint64
        type = "uint64";
        value = typeOrValue;
        contractAddress = valueOrContract as `0x${string}`;
      }

      return encryptWith(contractAddress, (builder) => {
        const method = getBuilderMethod(type);
        (builder[method] as Function)(value);
      });
    },
    [encryptWith]
  );

  const encryptBatch = useCallback(
    async (
      inputs: EncryptInput[],
      contractAddress: `0x${string}`
    ): Promise<EncryptedInput | undefined> => {
      return encryptWith(contractAddress, (builder) => {
        for (const input of inputs) {
          const method = getBuilderMethod(input.type);
          (builder[method] as Function)(input.value);
        }
      });
    },
    [encryptWith]
  );

  // TanStack Query mutation for encryption
  const encryptMutation = useMutation({
    mutationKey: chainId ? fhevmKeys.encrypt() : ["fhevm", "encrypt", "disabled"],
    mutationFn: async (params: EncryptMutationParams): Promise<EncryptedInput> => {
      if (!instance || !address) {
        throw new Error("FHEVM not ready");
      }

      // Use provided type or default to uint64
      const type = params.type ?? "uint64";
      const result = await encrypt(type, params.value, params.contractAddress);
      if (!result) {
        throw new Error("Encryption failed");
      }

      return result;
    },
  });

  // Build mutation state object
  const mutation: EncryptMutationState = useMemo(
    () => ({
      mutate: encryptMutation.mutate,
      mutateAsync: encryptMutation.mutateAsync,
      isPending: encryptMutation.isPending,
      isSuccess: encryptMutation.isSuccess,
      isError: encryptMutation.isError,
      isIdle: encryptMutation.isIdle,
      error: encryptMutation.error,
      data: encryptMutation.data,
      reset: encryptMutation.reset,
    }),
    [encryptMutation]
  );

  return {
    isReady,
    encrypt,
    encryptBatch,
    encryptWith,
    mutation,
  };
}

// Re-export utility functions for backward compatibility
export { getEncryptionMethod, toHex, buildParamsFromAbi } from "./useFHEEncryption";
