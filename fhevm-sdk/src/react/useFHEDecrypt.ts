"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FhevmDecryptionSignature, type SignerParams } from "../FhevmDecryptionSignature.js";
import { GenericStringStorage } from "../storage/GenericStringStorage.js";
import { FhevmInstance } from "../fhevmTypes.js";
import type { Eip1193Provider } from "../internal/eip1193.js";

export type FHEDecryptRequest = { handle: string; contractAddress: `0x${string}` };

/**
 * @deprecated Use useUserDecrypt instead, which integrates with FhevmProvider context.
 *
 * Legacy hook for FHE decryption. Requires manual provider and storage management.
 */
export const useFHEDecrypt = (params: {
  instance: FhevmInstance | undefined;
  /** EIP-1193 provider (window.ethereum, wagmi connector, etc.) */
  provider: Eip1193Provider | undefined;
  /** User's wallet address */
  address: `0x${string}` | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  requests: readonly FHEDecryptRequest[] | undefined;
}) => {
  const { instance, provider, address, fhevmDecryptionSignatureStorage, chainId, requests } = params;

  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [results, setResults] = useState<Record<string, string | bigint | boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const lastReqKeyRef = useRef<string>("");

  const requestsKey = useMemo(() => {
    if (!requests || requests.length === 0) return "";
    const sorted = [...requests].sort((a, b) =>
      (a.handle + a.contractAddress).localeCompare(b.handle + b.contractAddress),
    );
    return JSON.stringify(sorted);
  }, [requests]);

  const canDecrypt = useMemo(() => {
    return Boolean(instance && provider && address && requests && requests.length > 0 && !isDecrypting);
  }, [instance, provider, address, requests, isDecrypting]);

  const decrypt = useCallback(() => {
    if (isDecryptingRef.current) return;
    if (!instance || !provider || !address || !requests || requests.length === 0) return;

    const thisChainId = chainId;
    const thisProvider = provider;
    const thisAddress = address;
    const thisRequests = requests;

    // Capture the current requests key to avoid false "stale" detection on first run
    lastReqKeyRef.current = requestsKey;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Start decrypt");
    setError(null);

    const run = async () => {
      const isStale = () =>
        thisChainId !== chainId || thisProvider !== provider || thisAddress !== address || requestsKey !== lastReqKeyRef.current;

      try {
        console.log("[useFHEDecrypt] Starting decrypt...");
        const uniqueAddresses = Array.from(new Set(thisRequests.map(r => r.contractAddress)));
        console.log("[useFHEDecrypt] Unique addresses:", uniqueAddresses);

        const signer: SignerParams = {
          provider: thisProvider,
          address: thisAddress,
        };

        const sig: FhevmDecryptionSignature | null = await FhevmDecryptionSignature.loadOrSign(
          instance,
          uniqueAddresses as `0x${string}`[],
          signer,
          fhevmDecryptionSignatureStorage,
        );
        console.log("[useFHEDecrypt] Signature loaded:", !!sig);

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          setError("SIGNATURE_ERROR: Failed to create decryption signature");
          return;
        }

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setMessage("Call FHEVM userDecrypt...");

        const mutableReqs = thisRequests.map(r => ({ handle: r.handle, contractAddress: r.contractAddress }));

        let res: Record<string, string | bigint | boolean> = {};
        try {
          res = await instance.userDecrypt(
            mutableReqs,
            sig.privateKey,
            sig.publicKey,
            sig.signature,
            sig.contractAddresses,
            sig.userAddress,
            sig.startTimestamp,
            sig.durationDays,
          );
        } catch (e) {
          console.error("[useFHEDecrypt] userDecrypt FAILED:", e);
          const err = e as unknown as { name?: string; message?: string };
          const code = err && typeof err === "object" && "name" in (err as any) ? (err as any).name : "DECRYPT_ERROR";
          const msg = err && typeof err === "object" && "message" in (err as any) ? (err as any).message : "Decryption failed";
          setError(`${code}: ${msg}`);
          setMessage("FHEVM userDecrypt failed");
          return;
        }

        console.log("[useFHEDecrypt] userDecrypt result:", res);
        setMessage("FHEVM userDecrypt completed!");

        if (isStale()) {
          setMessage("Ignore FHEVM decryption");
          return;
        }

        setResults(res);
      } catch (e) {
        const err = e as unknown as { name?: string; message?: string };
        const code = err && typeof err === "object" && "name" in (err as any) ? (err as any).name : "UNKNOWN_ERROR";
        const msg = err && typeof err === "object" && "message" in (err as any) ? (err as any).message : "Unknown error";
        setError(`${code}: ${msg}`);
        setMessage("FHEVM decryption errored");
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
        lastReqKeyRef.current = requestsKey;
      }
    };

    run();
  }, [instance, provider, address, fhevmDecryptionSignatureStorage, chainId, requests, requestsKey]);

  return { canDecrypt, decrypt, isDecrypting, message, results, error, setMessage, setError } as const;
};
