"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFhevmContext } from "./context";
import { fhevmKeys } from "./queryKeys";

/**
 * Result from public decryption.
 */
export interface PublicDecryptResult {
  /** Decrypted values keyed by handle */
  clearValues: Record<string, string | bigint | boolean>;
  /** ABI-encoded clear values for contract callback */
  abiEncodedClearValues: `0x${string}`;
  /** Decryption proof for contract verification */
  decryptionProof: `0x${string}`;
}

/**
 * Parameters for usePublicDecrypt hook.
 */
export interface PublicDecryptParams {
  /** Array of encrypted handles to decrypt */
  handles: (string | undefined)[] | undefined;
}

/**
 * Return type for usePublicDecrypt hook.
 */
export interface UsePublicDecryptReturn {
  /**
   * Whether public decryption is ready to be called.
   * False if FHEVM not ready or no handles provided.
   */
  canDecrypt: boolean;

  /**
   * Start the public decryption process.
   * Results will be available in `result` when complete.
   */
  decrypt: () => void;

  /**
   * Async version of decrypt that returns the result directly.
   */
  decryptAsync: () => Promise<PublicDecryptResult | undefined>;

  /**
   * Full decryption result including proof and encoded values.
   * Use this when you need to call a contract callback.
   */
  result: PublicDecryptResult | undefined;

  /**
   * Decrypted values keyed by handle (convenience accessor).
   * Equivalent to result?.clearValues ?? {}
   */
  clearValues: Record<string, string | bigint | boolean>;

  /** Whether decryption is currently in progress */
  isDecrypting: boolean;

  /** Status message for UI feedback */
  message: string;

  /** Error message if decryption failed */
  error: string | null;

  /** Clear the error state */
  clearError: () => void;

  // ─────────────────────────────────────────────────────────────────────────────
  // TanStack Query additions
  // ─────────────────────────────────────────────────────────────────────────────

  /** Whether decryption completed successfully */
  isSuccess: boolean;

  /** Whether decryption failed */
  isError: boolean;

  /** Whether the hook is in idle state (not started) */
  isIdle: boolean;
}

/**
 * Hook for public decryption of FHE encrypted values.
 *
 * Public decryption reveals values to everyone - use this when:
 * - The value should be visible on-chain (e.g., auction results)
 * - You need to pass decrypted values to a contract callback
 * - No user-specific privacy is required
 *
 * **Important:** Values must be marked as publicly decryptable on-chain
 * using `FHE.makePubliclyDecryptable(handle)` before calling this hook.
 *
 * @example
 * ```tsx
 * // Basic usage
 * function AuctionResult({ handles }) {
 *   const { decrypt, clearValues, isDecrypting, canDecrypt } = usePublicDecrypt({
 *     handles
 *   });
 *
 *   return (
 *     <div>
 *       <p>Winner: {clearValues[handles[0]]?.toString() ?? 'Hidden'}</p>
 *       <button onClick={decrypt} disabled={!canDecrypt}>
 *         {isDecrypting ? 'Revealing...' : 'Reveal Result'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With contract callback
 * function RevealAndCallback({ handles, contractAddress }) {
 *   const { decryptAsync, canDecrypt } = usePublicDecrypt({ handles });
 *   const { writeContract } = useWriteContract();
 *
 *   const handleReveal = async () => {
 *     const result = await decryptAsync();
 *     if (!result) return;
 *
 *     // Call contract with proof
 *     await writeContract({
 *       address: contractAddress,
 *       abi: myContractAbi,
 *       functionName: 'callbackDecrypt',
 *       args: [
 *         handles,
 *         result.abiEncodedClearValues,
 *         result.decryptionProof
 *       ]
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleReveal} disabled={!canDecrypt}>
 *       Reveal & Submit
 *     </button>
 *   );
 * }
 * ```
 */
export function usePublicDecrypt(
  params: PublicDecryptParams | undefined
): UsePublicDecryptReturn {
  const { instance, chainId, status } = useFhevmContext();
  const queryClient = useQueryClient();

  // Filter out undefined handles
  const validHandles = useMemo(() => {
    if (!params?.handles) return undefined;
    const filtered = params.handles.filter((h): h is string => h !== undefined);
    return filtered.length > 0 ? filtered : undefined;
  }, [params?.handles]);

  // TanStack Query mutation for public decryption
  const mutation = useMutation({
    mutationKey: chainId
      ? fhevmKeys.publicDecryptBatch(chainId, validHandles ?? [])
      : ["fhevm", "publicDecrypt", "disabled"],

    mutationFn: async (handles: string[]): Promise<PublicDecryptResult> => {
      if (!instance) {
        throw new Error("FHEVM instance not ready");
      }
      if (!chainId) {
        throw new Error("Chain ID not available");
      }
      if (handles.length === 0) {
        throw new Error("No handles to decrypt");
      }

      // Call publicDecrypt on the instance
      const result = await instance.publicDecrypt(handles);

      // Cache individual results for fast lookups
      const clearValuesRecord = result.clearValues as Record<string, string | bigint | boolean>;
      for (const handle of handles) {
        const value = clearValuesRecord[handle];
        if (value !== undefined) {
          queryClient.setQueryData(
            fhevmKeys.publicDecryptHandle(chainId, handle),
            value
          );
        }
      }

      return {
        clearValues: result.clearValues as Record<string, string | bigint | boolean>,
        abiEncodedClearValues: result.abiEncodedClearValues,
        decryptionProof: result.decryptionProof,
      };
    },
  });

  // Can decrypt if we have everything needed
  const canDecrypt = useMemo(() => {
    return (
      status === "ready" &&
      instance !== undefined &&
      validHandles !== undefined &&
      validHandles.length > 0 &&
      !mutation.isPending
    );
  }, [status, instance, validHandles, mutation.isPending]);

  // Decrypt callback that triggers the mutation
  const decrypt = useCallback(() => {
    if (!canDecrypt || !validHandles) return;
    mutation.mutate(validHandles);
  }, [canDecrypt, validHandles, mutation]);

  // Async decrypt that returns the result
  const decryptAsync = useCallback(async () => {
    if (!canDecrypt || !validHandles) return undefined;
    return mutation.mutateAsync(validHandles);
  }, [canDecrypt, validHandles, mutation]);

  // Clear error by resetting mutation state
  const clearError = useCallback(() => {
    mutation.reset();
  }, [mutation]);

  // Generate message based on mutation state
  const message = useMemo(() => {
    if (mutation.isPending) return "Decrypting values...";
    if (mutation.isSuccess) return "Decryption complete";
    if (mutation.isError) return "Decryption failed";
    return "";
  }, [mutation.isPending, mutation.isSuccess, mutation.isError]);

  // Format error message
  const error = useMemo(() => {
    if (!mutation.error) return null;
    const err = mutation.error as Error;
    return `PUBLIC_DECRYPT_ERROR: ${err.message || "Unknown error"}`;
  }, [mutation.error]);

  return {
    canDecrypt,
    decrypt,
    decryptAsync,
    result: mutation.data,
    clearValues: mutation.data?.clearValues ?? {},
    isDecrypting: mutation.isPending,
    message,
    error,
    clearError,
    // TanStack Query additions
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    isIdle: mutation.isIdle,
  };
}
