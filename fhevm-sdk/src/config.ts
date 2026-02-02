import type { FhevmChain } from "./chains/types";

/**
 * Storage interface for persisting FHE-related data.
 * Compatible with localStorage, sessionStorage, or custom implementations.
 */
export interface FhevmStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/**
 * No-op storage implementation for SSR or when persistence is not needed.
 */
export const noopStorage: FhevmStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * Create an in-memory storage implementation.
 * Useful for testing or when localStorage is not available.
 */
export function createMemoryStorage(): FhevmStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

/**
 * Create a storage wrapper around a Web Storage API compliant object.
 */
export function createStorage(options?: {
  storage?: Storage;
  key?: string;
}): FhevmStorage {
  const storage = options?.storage;
  const prefix = options?.key ?? "fhevm";

  if (!storage) {
    return noopStorage;
  }

  return {
    getItem: (key) => storage.getItem(`${prefix}.${key}`),
    setItem: (key, value) => storage.setItem(`${prefix}.${key}`, value),
    removeItem: (key) => storage.removeItem(`${prefix}.${key}`),
  };
}

/**
 * Options for creating an FhevmConfig.
 */
export interface FhevmConfigOptions {
  /**
   * Array of FHE-enabled chains to support.
   * At least one chain must be provided.
   */
  chains: readonly FhevmChain[];

  /**
   * Storage for persisting decryption signatures and other FHE data.
   * Defaults to localStorage in browser, noopStorage in SSR.
   */
  storage?: FhevmStorage;

  /**
   * Enable SSR mode. When true, uses noopStorage by default
   * and defers initialization until client-side hydration.
   */
  ssr?: boolean;
}

/**
 * FhevmConfig holds the configuration for FHE operations.
 * Created once at app startup and passed to FhevmProvider.
 */
export interface FhevmConfig {
  /** Configured chains */
  readonly chains: readonly FhevmChain[];

  /** Storage instance for persistence */
  readonly storage: FhevmStorage;

  /** SSR mode flag */
  readonly ssr: boolean;

  /**
   * Get a chain by its ID.
   * Returns undefined if the chain is not configured.
   */
  getChain(chainId: number): FhevmChain | undefined;

  /**
   * Check if a chain ID corresponds to a mock chain.
   */
  isMockChain(chainId: number): boolean;

  /**
   * Get the RPC URL for a mock chain.
   * Returns undefined for production chains or if chain is not found.
   */
  getMockRpcUrl(chainId: number): string | undefined;

  /**
   * Internal state - not for public use.
   * @internal
   */
  _internal: {
    chainMap: Map<number, FhevmChain>;
  };
}

/**
 * Create an FhevmConfig for use with FhevmProvider.
 * Similar to wagmi's createConfig but for FHE operations.
 *
 * @example
 * ```ts
 * import { createFhevmConfig, sepolia, hardhatLocal } from 'fhevm-sdk'
 *
 * const config = createFhevmConfig({
 *   chains: [sepolia, hardhatLocal],
 * })
 * ```
 */
export function createFhevmConfig(options: FhevmConfigOptions): FhevmConfig {
  const { chains, ssr = false } = options;

  if (!chains || chains.length === 0) {
    throw new Error("createFhevmConfig: At least one chain must be provided");
  }

  // Build chain lookup map
  const chainMap = new Map<number, FhevmChain>();
  for (const chain of chains) {
    if (chainMap.has(chain.id)) {
      console.warn(
        `createFhevmConfig: Duplicate chain ID ${chain.id} (${chain.name}). Using the first definition.`
      );
      continue;
    }
    chainMap.set(chain.id, chain);
  }

  // Determine storage
  let storage: FhevmStorage;
  if (options.storage) {
    storage = options.storage;
  } else if (ssr) {
    storage = noopStorage;
  } else if (typeof window !== "undefined" && window.localStorage) {
    storage = createStorage({ storage: window.localStorage });
  } else {
    storage = noopStorage;
  }

  const config: FhevmConfig = {
    chains,
    storage,
    ssr,

    getChain(chainId: number): FhevmChain | undefined {
      return chainMap.get(chainId);
    },

    isMockChain(chainId: number): boolean {
      const chain = chainMap.get(chainId);
      return chain?.isMock === true;
    },

    getMockRpcUrl(chainId: number): string | undefined {
      const chain = chainMap.get(chainId);
      if (chain?.isMock && chain.rpcUrl) {
        return chain.rpcUrl;
      }
      return undefined;
    },

    _internal: {
      chainMap,
    },
  };

  return config;
}

/**
 * Type helper to extract chain IDs from a config.
 * Useful for type-safe chain selection.
 */
export type ConfigChainId<C extends FhevmConfig> =
  C["chains"][number]["id"];
