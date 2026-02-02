import { QueryClient } from "@tanstack/react-query";

/**
 * SDK-specific QueryClient instance for FHEVM operations.
 *
 * This client is used internally by the SDK for:
 * - Caching decrypted values
 * - Managing signature state
 * - Deduplicating encryption/decryption requests
 *
 * Default options:
 * - staleTime: 5 minutes (decrypted values don't change)
 * - gcTime: 30 minutes (keep in cache for reuse)
 * - retry: 1 for queries (network issues)
 * - retry: 0 for mutations (user-initiated, don't auto-retry)
 * - refetchOnWindowFocus: false (FHE data is stable)
 */
export const fhevmQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Creates a new QueryClient with custom options.
 * Use this if you need different caching behavior.
 */
export function createFhevmQueryClient(
  options?: ConstructorParameters<typeof QueryClient>[0]
): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        ...options?.defaultOptions?.queries,
      },
      mutations: {
        retry: 0,
        ...options?.defaultOptions?.mutations,
      },
    },
  });
}
