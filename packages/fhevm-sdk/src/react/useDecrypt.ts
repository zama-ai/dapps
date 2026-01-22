"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFhevmContext } from "./context";
import { FhevmDecryptionSignature } from "../FhevmDecryptionSignature";
import { fhevmKeys } from "./queryKeys";
import type { ethers } from "ethers";

/**
 * Request for decrypting an encrypted handle.
 */
export interface DecryptRequest {
  /** The encrypted handle to decrypt */
  handle: string;
  /** Contract address that holds the encrypted value */
  contractAddress: `0x${string}`;
}

/**
 * Return type for useDecrypt hook.
 */
export interface UseDecryptReturn {
  /**
   * Whether decryption is ready to be called.
   * False if FHEVM not ready, no signer, or already decrypting.
   */
  canDecrypt: boolean;

  /**
   * Decrypted results keyed by handle.
   * Empty until decrypt() is called and completes.
   */
  results: Record<string, string | bigint | boolean>;

  /**
   * Start the decryption process.
   * Results will be available in `results` when complete.
   */
  decrypt: () => void;

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
 * Hook for decrypting FHE encrypted values using TanStack Query mutations.
 *
 * Handles decryption signature management automatically using
 * the storage from FhevmConfig. Results are cached in the query client
 * for fast lookups.
 *
 * @param requests - Array of handles to decrypt, or undefined
 * @param signer - Ethers signer for signing decryption requests
 *
 * @example
 * ```tsx
 * function BalanceDisplay({ handle, contractAddress }) {
 *   const { data: signer } = useEthersSigner()
 *
 *   const { results, decrypt, isDecrypting, canDecrypt, isSuccess } = useDecrypt(
 *     handle ? [{ handle, contractAddress }] : undefined,
 *     signer
 *   )
 *
 *   const balance = handle ? results[handle] : undefined
 *
 *   return (
 *     <div>
 *       <p>Balance: {balance?.toString() ?? 'Encrypted'}</p>
 *       <button onClick={decrypt} disabled={!canDecrypt}>
 *         {isDecrypting ? 'Decrypting...' : isSuccess ? 'Decrypted!' : 'Decrypt'}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useDecrypt(
  requests: readonly DecryptRequest[] | undefined,
  signer: ethers.JsonRpcSigner | undefined
): UseDecryptReturn {
  const { instance, config, chainId, status } = useFhevmContext();
  const queryClient = useQueryClient();

  // Create a stable key for the current requests
  const requestsKey = useMemo(() => {
    if (!requests || requests.length === 0) return "";
    const sorted = [...requests].sort((a, b) =>
      (a.handle + a.contractAddress).localeCompare(b.handle + b.contractAddress)
    );
    return JSON.stringify(sorted);
  }, [requests]);

  // TanStack Query mutation for decryption
  const mutation = useMutation({
    mutationKey: chainId
      ? fhevmKeys.decryptBatch(chainId, requests?.map((r) => r.handle) ?? [])
      : ["fhevm", "decrypt", "disabled"],

    mutationFn: async (
      decryptRequests: readonly DecryptRequest[]
    ): Promise<Record<string, string | bigint | boolean>> => {
      if (!instance) {
        throw new Error("FHEVM instance not ready");
      }
      if (!signer) {
        throw new Error("Signer not available");
      }
      if (!chainId) {
        throw new Error("Chain ID not available");
      }
      if (decryptRequests.length === 0) {
        throw new Error("No requests to decrypt");
      }

      // Get unique contract addresses
      const uniqueAddresses = Array.from(
        new Set(decryptRequests.map((r) => r.contractAddress))
      );

      // Load or create decryption signature
      const sig = await FhevmDecryptionSignature.loadOrSign(
        instance,
        uniqueAddresses as `0x${string}`[],
        signer,
        config.storage
      );

      if (!sig) {
        throw new Error("SIGNATURE_ERROR: Unable to create decryption signature");
      }

      // Prepare requests for userDecrypt
      const mutableReqs = decryptRequests.map((r) => ({
        handle: r.handle,
        contractAddress: r.contractAddress,
      }));

      // Call userDecrypt
      const decryptResults = await instance.userDecrypt(
        mutableReqs,
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      // Cache individual results for fast lookups
      for (const request of decryptRequests) {
        const value = (decryptResults as Record<string, string | bigint | boolean>)[request.handle];
        if (value !== undefined) {
          queryClient.setQueryData(
            fhevmKeys.decryptHandle(chainId, request.handle, request.contractAddress),
            value
          );
        }
      }

      return decryptResults;
    },
  });

  // Can decrypt if we have everything needed
  const canDecrypt = useMemo(() => {
    return (
      status === "ready" &&
      instance !== undefined &&
      signer !== undefined &&
      requests !== undefined &&
      requests.length > 0 &&
      !mutation.isPending
    );
  }, [status, instance, signer, requests, mutation.isPending]);

  // Decrypt callback that triggers the mutation
  const decrypt = useCallback(() => {
    if (!canDecrypt || !requests || requests.length === 0) return;
    mutation.mutate(requests);
  }, [canDecrypt, requests, mutation]);

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
    return `DECRYPT_ERROR: ${err.message || "Unknown error"}`;
  }, [mutation.error]);

  return {
    canDecrypt,
    results: mutation.data ?? {},
    decrypt,
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
