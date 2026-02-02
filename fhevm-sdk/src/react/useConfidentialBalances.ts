"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { useFhevmContext } from "./context";
import { useEthersSigner } from "./useEthersSigner";
import { useUserDecrypt, type DecryptRequest } from "./useUserDecrypt";
import { useUserDecryptedValues } from "./useUserDecryptedValue";
import { FhevmDecryptionSignature } from "../FhevmDecryptionSignature";
import { ERC7984_ABI } from "../abi/index";
import type {
  BalanceStatus,
  ConfidentialBalanceConfig,
  ConfidentialBalanceResult,
  DecryptedValue,
  UseConfidentialBalancesOptions,
  UseConfidentialBalancesReturn,
} from "../types/balance";

export type {
  BalanceStatus,
  ConfidentialBalanceConfig,
  ConfidentialBalanceResult,
  DecryptedValue,
  UseConfidentialBalancesOptions,
  UseConfidentialBalancesReturn,
};

function makePendingResults(length: number): ConfidentialBalanceResult[] {
  return Array.from({ length }, () => ({
    result: undefined,
    status: "pending" as const,
    error: undefined,
  }));
}

/**
 * Hook for reading encrypted balance handles from multiple ERC7984 contracts in parallel.
 *
 * Follows wagmi's `useReadContracts` pattern — accepts an array of contract configs
 * and returns per-item results.
 *
 * When `decrypt: true` is set, automatically composes `useUserDecrypt` and
 * `useUserDecryptedValues` internally so consumers get cleartext values without
 * manual wiring.
 *
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useConfidentialBalances({
 *   contracts: [
 *     { contractAddress: tokenA },
 *     { contractAddress: tokenB },
 *     { contractAddress: tokenC, account: otherAddress },
 *   ],
 * });
 * // data[0].result — handle for tokenA balance
 * // data[1].result — handle for tokenB balance
 * // data[2].result — handle for tokenC balance (for otherAddress)
 * ```
 *
 * @example
 * ```tsx
 * // With auto-decryption
 * const { data, decryptAll, isDecrypting, isAllDecrypted } = useConfidentialBalances({
 *   contracts: [{ contractAddress: tokenA }],
 *   decrypt: true,
 * });
 * // data[0].decryptedValue — cleartext value after decryptAll() is called
 * ```
 */
export function useConfidentialBalances(
  options: UseConfidentialBalancesOptions,
): UseConfidentialBalancesReturn {
  const {
    contracts,
    account: sharedAccount,
    enabled = true,
    decrypt: autoDecrypt = false,
  } = options;

  const { address: contextAddress, storage, instance } = useFhevmContext();
  const { provider, isReady: providerReady } = useEthersSigner();

  const defaultAccount = sharedAccount ?? contextAddress;

  const [data, setData] = useState<ConfidentialBalanceResult[]>(
    makePendingResults(contracts.length),
  );
  const [status, setStatus] = useState<BalanceStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const hasFetchedRef = useRef(false);

  // Stable serialization of contracts for effect dependency
  const contractsKey = JSON.stringify(contracts);

  const fetchBalances = useCallback(
    async (isRefetch: boolean) => {
      if (!provider) {
        setError(new Error("Provider not available. Please connect your wallet."));
        setStatus("error");
        return;
      }

      if (!defaultAccount && contracts.every((c) => !c.account)) {
        setError(new Error("No account address available."));
        setStatus("error");
        return;
      }

      try {
        if (isRefetch) {
          setIsRefetching(true);
        } else {
          setStatus("loading");
        }
        setError(null);

        const settled = await Promise.allSettled(
          contracts.map(async (config) => {
            const account = config.account ?? defaultAccount;
            if (!account) {
              throw new Error("No account address available for contract " + config.contractAddress);
            }
            const abi = config.abi ?? ERC7984_ABI;
            const contract = new ethers.Contract(config.contractAddress, abi, provider);
            const result: string = await contract.confidentialBalanceOf(account);
            console.log("[useConfidentialBalances] confidentialBalanceOf result:", {
              contractAddress: config.contractAddress,
              account,
              result,
              isZeroHash: result === ethers.ZeroHash,
            });
            return result === ethers.ZeroHash ? undefined : (result as `0x${string}`);
          }),
        );

        const results: ConfidentialBalanceResult[] = settled.map((s) => {
          if (s.status === "fulfilled") {
            return { result: s.value, status: "success" as const, error: undefined };
          }
          const err = s.reason instanceof Error ? s.reason : new Error(String(s.reason));
          return { result: undefined, status: "failure" as const, error: err };
        });

        setData(results);

        const hasError = results.some((r) => r.status === "failure");
        if (hasError) {
          const firstError = results.find((r) => r.status === "failure")!.error!;
          setError(firstError);
          setStatus("error");
        } else {
          setStatus("success");
        }
      } catch (err) {
        const fetchError = err instanceof Error ? err : new Error(String(err));
        setError(fetchError);
        setStatus("error");
      } finally {
        setIsRefetching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provider, defaultAccount, contractsKey],
  );

  useEffect(() => {
    if (!enabled || !providerReady || (!defaultAccount && contracts.every((c) => !c.account))) {
      if (!enabled) {
        setStatus("idle");
        setData(makePendingResults(contracts.length));
        setError(null);
        hasFetchedRef.current = false;
      }
      return;
    }

    const isRefetch = hasFetchedRef.current;
    hasFetchedRef.current = true;
    fetchBalances(isRefetch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, providerReady, defaultAccount, contractsKey, fetchBalances]);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    await fetchBalances(true);
  }, [enabled, fetchBalances]);

  const isLoading = status === "loading";
  const isFetching = isLoading || isRefetching;
  const isError = status === "error";
  const isSuccess = status === "success";

  // ─────────────────────────────────────────────────────────────────────────────
  // Auto-decryption: compose useUserDecrypt + useUserDecryptedValues
  // Hooks are called unconditionally (rules of hooks); undefined input = no-op.
  // ─────────────────────────────────────────────────────────────────────────────

  // 1. Build DecryptRequest[] from successfully fetched handles
  const decryptRequests: readonly DecryptRequest[] | undefined = useMemo(() => {
    if (!autoDecrypt) return undefined;
    const reqs: DecryptRequest[] = [];
    data.forEach((item, i) => {
      if (item.status === "success" && item.result) {
        reqs.push({ handle: item.result, contractAddress: contracts[i].contractAddress });
      }
    });
    return reqs.length > 0 ? reqs : undefined;
  }, [autoDecrypt, data, contracts]);

  // 2. Always call hooks (rules of hooks), pass undefined when disabled
  const {
    decrypt: triggerDecrypt,
    isDecrypting,
    canDecrypt,
    results: decryptResults,
    error: decryptErrorMsg,
  } = useUserDecrypt(decryptRequests);

  // 3. Read TanStack Query cache for previously decrypted values
  const cacheHandles = useMemo(() => {
    if (!autoDecrypt) return undefined;
    const handles: { handle: string; contractAddress: `0x${string}` }[] = [];
    data.forEach((item, i) => {
      if (item.status === "success" && item.result) {
        handles.push({ handle: item.result, contractAddress: contracts[i].contractAddress });
      }
    });
    return handles.length > 0 ? handles : undefined;
  }, [autoDecrypt, data, contracts]);

  const { values: cachedValues, allCached, cachedCount } = useUserDecryptedValues(cacheHandles);

  // 3b. Auto-decrypt: probe storage for a cached EIP-712 signature.
  //     If found, trigger decryption automatically (no wallet popup).
  const [signatureCached, setSignatureCached] = useState(false);
  const autoDecryptTriggeredRef = useRef(false);

  // Stable key for the decrypt requests so we can reset the trigger ref
  const decryptRequestsKey = useMemo(
    () => (decryptRequests ? decryptRequests.map((r) => r.handle).join(",") : ""),
    [decryptRequests],
  );

  // Reset trigger when the set of handles changes
  useEffect(() => {
    autoDecryptTriggeredRef.current = false;
    setSignatureCached(false);
  }, [decryptRequestsKey]);

  // Probe storage for an existing signature
  useEffect(() => {
    if (!autoDecrypt || !storage || !instance || !decryptRequests || allCached) {
      return;
    }

    const userAddr = sharedAccount ?? contextAddress;
    if (!userAddr) return;

    const contractAddresses = [
      ...new Set(decryptRequests.map((r) => r.contractAddress)),
    ];

    let cancelled = false;
    FhevmDecryptionSignature.loadFromGenericStringStorage(
      storage,
      instance,
      contractAddresses,
      userAddr,
    )
      .then((sig) => {
        if (!cancelled) setSignatureCached(sig !== null);
      })
      .catch(() => {
        if (!cancelled) setSignatureCached(false);
      });

    return () => {
      cancelled = true;
    };
  }, [autoDecrypt, storage, instance, decryptRequests, allCached, sharedAccount, contextAddress]);

  // Auto-trigger decrypt when signature is cached and values aren't already decrypted
  useEffect(() => {
    if (
      autoDecrypt &&
      signatureCached &&
      canDecrypt &&
      !isDecrypting &&
      !allCached &&
      !autoDecryptTriggeredRef.current
    ) {
      autoDecryptTriggeredRef.current = true;
      triggerDecrypt();
    }
  }, [autoDecrypt, signatureCached, canDecrypt, isDecrypting, allCached, triggerDecrypt]);

  // 4. Merge decrypted values into data array
  const enrichedData = useMemo(() => {
    if (!autoDecrypt) return data;
    let cacheIdx = 0;
    return data.map((item) => {
      if (item.status !== "success" || !item.result) return item;
      // Prefer fresh mutation results, fallback to cache
      const value = decryptResults[item.result] ?? cachedValues[cacheIdx];
      cacheIdx++;
      return value !== undefined ? { ...item, decryptedValue: value } : item;
    });
  }, [autoDecrypt, data, decryptResults, cachedValues]);

  // 5. Return enrichedData + decryption fields with safe defaults
  const noOp = useCallback(() => {}, []);

  return {
    data: enrichedData,
    isLoading,
    isRefetching,
    isFetching,
    isError,
    isSuccess,
    error,
    refetch,
    status,
    decryptAll: autoDecrypt ? triggerDecrypt : noOp,
    isDecrypting: autoDecrypt ? isDecrypting : false,
    canDecrypt: autoDecrypt ? canDecrypt : false,
    decryptError: autoDecrypt ? decryptErrorMsg : null,
    isAllDecrypted: autoDecrypt && allCached && (cacheHandles?.length ?? 0) > 0,
    decryptedCount: autoDecrypt ? cachedCount : 0,
  };
}
