"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFhevmContext } from "./context";
import { FhevmDecryptionSignature } from "../FhevmDecryptionSignature";
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
}

/**
 * Hook for decrypting FHE encrypted values.
 *
 * Handles decryption signature management automatically using
 * the storage from FhevmConfig.
 *
 * @param requests - Array of handles to decrypt, or undefined
 * @param signer - Ethers signer for signing decryption requests
 *
 * @example
 * ```tsx
 * function BalanceDisplay({ handle, contractAddress }) {
 *   const { data: signer } = useEthersSigner()
 *
 *   const { results, decrypt, isDecrypting, canDecrypt } = useDecrypt(
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
 *         {isDecrypting ? 'Decrypting...' : 'Decrypt'}
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

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<Record<string, string | bigint | boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Track current decrypt operation to handle stale requests
  const decryptRef = useRef<{
    isRunning: boolean;
    requestsKey: string;
  }>({
    isRunning: false,
    requestsKey: "",
  });

  // Create a stable key for the current requests
  const requestsKey = useMemo(() => {
    if (!requests || requests.length === 0) return "";
    const sorted = [...requests].sort((a, b) =>
      (a.handle + a.contractAddress).localeCompare(b.handle + b.contractAddress)
    );
    return JSON.stringify(sorted);
  }, [requests]);

  // Can decrypt if we have everything needed
  const canDecrypt = useMemo(() => {
    return (
      status === "ready" &&
      instance !== undefined &&
      signer !== undefined &&
      requests !== undefined &&
      requests.length > 0 &&
      !isDecrypting
    );
  }, [status, instance, signer, requests, isDecrypting]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const decrypt = useCallback(() => {
    if (decryptRef.current.isRunning) return;
    if (!instance || !signer || !requests || requests.length === 0) return;

    // Capture current state
    const currentChainId = chainId;
    const currentSigner = signer;
    const currentRequests = requests;
    const currentKey = requestsKey;

    decryptRef.current = {
      isRunning: true,
      requestsKey: currentKey,
    };

    setIsDecrypting(true);
    setMessage("Starting decryption...");
    setError(null);

    const run = async () => {
      const isStale = () =>
        currentChainId !== chainId ||
        currentSigner !== signer ||
        currentKey !== decryptRef.current.requestsKey;

      try {
        // Get unique contract addresses
        const uniqueAddresses = Array.from(
          new Set(currentRequests.map((r) => r.contractAddress))
        );

        // Load or create decryption signature
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          uniqueAddresses as `0x${string}`[],
          currentSigner,
          config.storage
        );

        if (!sig) {
          setMessage("Failed to create decryption signature");
          setError("SIGNATURE_ERROR: Unable to create decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Request cancelled (state changed)");
          return;
        }

        setMessage("Decrypting values...");

        // Prepare requests for userDecrypt
        const mutableReqs = currentRequests.map((r) => ({
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

        if (isStale()) {
          setMessage("Request cancelled (state changed)");
          return;
        }

        setResults(decryptResults);
        setMessage("Decryption complete");
      } catch (e) {
        console.error("[useDecrypt] Decryption failed:", e);
        const err = e as Error;
        setError(`DECRYPT_ERROR: ${err.message || "Unknown error"}`);
        setMessage("Decryption failed");
      } finally {
        decryptRef.current.isRunning = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [instance, signer, requests, requestsKey, chainId, config.storage]);

  // Reset results when requests change
  useEffect(() => {
    setResults({});
    setError(null);
  }, [requestsKey]);

  return {
    canDecrypt,
    results,
    decrypt,
    isDecrypting,
    message,
    error,
    clearError,
  };
}
