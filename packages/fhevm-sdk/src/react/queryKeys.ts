/**
 * Query key factory for FHEVM TanStack Query operations.
 *
 * Following TanStack Query best practices for hierarchical keys:
 * - Keys are arrays for granular invalidation
 * - More specific keys extend from broader ones
 * - Use factory functions for type safety
 *
 * @example
 * ```typescript
 * // Invalidate all FHEVM queries
 * queryClient.invalidateQueries({ queryKey: fhevmKeys.all })
 *
 * // Invalidate all decryption queries
 * queryClient.invalidateQueries({ queryKey: fhevmKeys.decrypt() })
 *
 * // Get cached value for specific handle
 * queryClient.getQueryData(fhevmKeys.decryptHandle(chainId, handle, contract))
 * ```
 */
export const fhevmKeys = {
  /** Root key for all FHEVM queries */
  all: ["fhevm"] as const,

  // ─────────────────────────────────────────────────────────────────────────────
  // Decryption Queries
  // ─────────────────────────────────────────────────────────────────────────────

  /** Base key for all decryption queries */
  decrypt: () => [...fhevmKeys.all, "decrypt"] as const,

  /** Key for a specific decrypted handle value */
  decryptHandle: (chainId: number, handle: string, contractAddress: string) =>
    [...fhevmKeys.decrypt(), chainId, handle, contractAddress] as const,

  /** Key for batch decryption results */
  decryptBatch: (chainId: number, handles: string[]) =>
    [...fhevmKeys.decrypt(), chainId, "batch", handles.sort().join(",")] as const,

  // ─────────────────────────────────────────────────────────────────────────────
  // Signature Queries
  // ─────────────────────────────────────────────────────────────────────────────

  /** Base key for all signature queries */
  signature: () => [...fhevmKeys.all, "signature"] as const,

  /** Key for a user's decryption signature on a specific chain */
  signatureFor: (chainId: number, address: string) =>
    [...fhevmKeys.signature(), chainId, address.toLowerCase()] as const,

  // ─────────────────────────────────────────────────────────────────────────────
  // Encryption Mutations (keys useful for tracking/invalidation)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Base key for all encryption mutations */
  encrypt: () => [...fhevmKeys.all, "encrypt"] as const,

  /** Key for tracking encryption to a specific contract */
  encryptFor: (chainId: number, contractAddress: string) =>
    [...fhevmKeys.encrypt(), chainId, contractAddress.toLowerCase()] as const,

  // ─────────────────────────────────────────────────────────────────────────────
  // Instance/Initialization Queries
  // ─────────────────────────────────────────────────────────────────────────────

  /** Base key for FHEVM instance queries */
  instance: () => [...fhevmKeys.all, "instance"] as const,

  /** Key for instance on a specific chain */
  instanceFor: (chainId: number) =>
    [...fhevmKeys.instance(), chainId] as const,
} as const;

/** Type helper for query key arrays */
export type FhevmQueryKey = ReturnType<
  (typeof fhevmKeys)[keyof typeof fhevmKeys]
>;
