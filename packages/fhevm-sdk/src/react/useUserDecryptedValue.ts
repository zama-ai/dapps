"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useFhevmContext } from "./context";
import { fhevmKeys } from "./queryKeys";

/**
 * Return type for useUserDecryptedValue hook.
 */
export interface UseDecryptedValueReturn {
  /** The cached decrypted value, or undefined if not cached */
  data: string | bigint | boolean | undefined;

  /** Whether the value exists in the cache */
  isCached: boolean;

  /** The handle being queried */
  handle: string | undefined;

  /** The contract address being queried */
  contractAddress: string | undefined;
}

/**
 * Hook for reading cached decrypted values without triggering new decryption.
 *
 * This hook provides a read-only view of the decryption cache populated by
 * useUserDecrypt. It's useful for:
 * - Displaying previously decrypted values
 * - Checking if a value has been decrypted before
 * - Avoiding redundant decryption operations
 *
 * Note: This hook does NOT trigger decryption. To decrypt values,
 * use the useUserDecrypt hook instead.
 *
 * @param handle - The encrypted handle to look up, or undefined
 * @param contractAddress - The contract address, or undefined
 *
 * @example
 * ```tsx
 * function CachedBalance({ handle, contractAddress }) {
 *   const { data, isCached } = useUserDecryptedValue(handle, contractAddress)
 *
 *   if (!isCached) {
 *     return <p>Value not decrypted yet</p>
 *   }
 *
 *   return <p>Cached balance: {data?.toString()}</p>
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Use with useUserDecrypt for a complete flow
 * function Balance({ handle, contractAddress }) {
 *   const { data: signer } = useEthersSigner()
 *   const { isCached, data: cachedValue } = useUserDecryptedValue(handle, contractAddress)
 *   const { decrypt, isDecrypting, canDecrypt } = useUserDecrypt(
 *     handle && !isCached ? [{ handle, contractAddress }] : undefined,
 *     signer
 *   )
 *
 *   // Show cached value if available
 *   if (isCached) {
 *     return <p>Balance: {cachedValue?.toString()}</p>
 *   }
 *
 *   return (
 *     <div>
 *       <p>Balance: Encrypted</p>
 *       <button onClick={decrypt} disabled={!canDecrypt || isDecrypting}>
 *         {isDecrypting ? 'Decrypting...' : 'Decrypt'}
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useUserDecryptedValue(
  handle: string | undefined,
  contractAddress: `0x${string}` | undefined
): UseDecryptedValueReturn {
  const { chainId } = useFhevmContext();
  const queryClient = useQueryClient();

  const data = useMemo(() => {
    if (!handle || !contractAddress || !chainId) {
      return undefined;
    }

    const queryKey = fhevmKeys.decryptHandle(chainId, handle, contractAddress);
    return queryClient.getQueryData<string | bigint | boolean>(queryKey);
  }, [handle, contractAddress, chainId, queryClient]);

  const isCached = data !== undefined;

  return {
    data,
    isCached,
    handle,
    contractAddress,
  };
}

/**
 * Hook for reading multiple cached decrypted values at once.
 *
 * @param handles - Array of { handle, contractAddress } to look up
 *
 * @example
 * ```tsx
 * function TokenBalances({ tokens }) {
 *   const cached = useUserDecryptedValues(
 *     tokens.map(t => ({ handle: t.handle, contractAddress: t.address }))
 *   )
 *
 *   return (
 *     <ul>
 *       {tokens.map((token, i) => (
 *         <li key={token.handle}>
 *           {token.name}: {cached.values[i]?.toString() ?? 'Encrypted'}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useUserDecryptedValues(
  handles: readonly { handle: string; contractAddress: `0x${string}` }[] | undefined
): {
  values: (string | bigint | boolean | undefined)[];
  allCached: boolean;
  cachedCount: number;
} {
  const { chainId } = useFhevmContext();
  const queryClient = useQueryClient();

  const result = useMemo(() => {
    if (!handles || handles.length === 0 || !chainId) {
      return { values: [], allCached: false, cachedCount: 0 };
    }

    const values = handles.map(({ handle, contractAddress }) => {
      const queryKey = fhevmKeys.decryptHandle(chainId, handle, contractAddress);
      return queryClient.getQueryData<string | bigint | boolean>(queryKey);
    });

    const cachedCount = values.filter((v) => v !== undefined).length;

    return {
      values,
      allCached: cachedCount === handles.length,
      cachedCount,
    };
  }, [handles, chainId, queryClient]);

  return result;
}
