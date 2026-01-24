/**
 * Storage adapters for fhevm-sdk.
 *
 * SECURITY NOTE: The SDK does NOT choose a default storage.
 * Developers must explicitly choose their storage strategy.
 *
 * Options from most to least secure:
 * 1. memoryStorage - Keys cleared on page refresh (most secure, worst UX)
 * 2. sessionStorageAdapter - Keys cleared when tab closes
 * 3. localStorageAdapter - Persistent, accessible to any JS on the page
 * 4. indexedDBStorage - Persistent, slightly better isolation
 * 5. Custom encrypted storage - Best security if implemented correctly
 */

import { GenericStringStorage } from "./GenericStringStorage";

/**
 * In-memory storage. Keys are lost on page refresh.
 * Most secure option but requires re-signing on every page load.
 */
class MemoryStorage implements GenericStringStorage {
  #store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#store.set(key, value);
  }

  removeItem(key: string): void {
    this.#store.delete(key);
  }

  clear(): void {
    this.#store.clear();
  }
}

/**
 * Singleton memory storage instance.
 * Keys are cleared on page refresh.
 */
export const memoryStorage: GenericStringStorage = new MemoryStorage();

/**
 * localStorage adapter.
 *
 * WARNING: Data persists across sessions and is accessible to any
 * JavaScript running on the same origin. Use with caution.
 */
class LocalStorageAdapter implements GenericStringStorage {
  #prefix: string;

  constructor(prefix = "fhevm:") {
    this.#prefix = prefix;
  }

  getItem(key: string): string | null {
    if (typeof window === "undefined") {
      console.log("[LocalStorageAdapter] getItem - window undefined (SSR)");
      return null;
    }
    const fullKey = this.#prefix + key;
    const value = localStorage.getItem(fullKey);
    console.log("[LocalStorageAdapter] getItem:", fullKey, "->", value ? `${value.length} chars` : "null");
    return value;
  }

  setItem(key: string, value: string): void {
    if (typeof window === "undefined") {
      console.log("[LocalStorageAdapter] setItem - window undefined (SSR)");
      return;
    }
    const fullKey = this.#prefix + key;
    console.log("[LocalStorageAdapter] setItem:", fullKey, "->", value.length, "chars");
    localStorage.setItem(fullKey, value);
    // Verify it was saved
    const saved = localStorage.getItem(fullKey);
    console.log("[LocalStorageAdapter] verified save:", saved ? "OK" : "FAILED");
  }

  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.#prefix + key);
  }
}

/**
 * localStorage storage instance.
 * Data persists across sessions.
 */
export const localStorageAdapter: GenericStringStorage = new LocalStorageAdapter();

/**
 * sessionStorage adapter.
 *
 * Data persists until the tab is closed. Slightly more secure than
 * localStorage as data is cleared when the browsing session ends.
 */
class SessionStorageAdapter implements GenericStringStorage {
  #prefix: string;

  constructor(prefix = "fhevm:") {
    this.#prefix = prefix;
  }

  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(this.#prefix + key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(this.#prefix + key, value);
  }

  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(this.#prefix + key);
  }
}

/**
 * sessionStorage storage instance.
 * Data persists until the tab is closed.
 */
export const sessionStorageAdapter: GenericStringStorage = new SessionStorageAdapter();

/**
 * Create a custom storage adapter with a prefix.
 * Useful for isolating different apps or environments.
 */
export function createLocalStorageAdapter(prefix: string): GenericStringStorage {
  return new LocalStorageAdapter(prefix);
}

/**
 * Create a custom session storage adapter with a prefix.
 */
export function createSessionStorageAdapter(prefix: string): GenericStringStorage {
  return new SessionStorageAdapter(prefix);
}

/**
 * No-op storage that doesn't store anything.
 * Use this to disable caching entirely.
 */
class NoOpStorage implements GenericStringStorage {
  getItem(): null {
    return null;
  }

  setItem(): void {
    // Intentionally empty - no storage
  }

  removeItem(): void {
    // Intentionally empty - no storage
  }
}

/**
 * No-op storage instance.
 * Use this to disable signature caching entirely.
 * Users will need to re-sign on every decrypt operation.
 */
export const noOpStorage: GenericStringStorage = new NoOpStorage();
