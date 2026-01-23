# Storage

fhevm-sdk uses storage to persist decryption signatures, avoiding repeated signature requests.

## Storage Options

### Web Storage (Default)

Uses browser's localStorage or sessionStorage:

```tsx
import { createStorage } from "fhevm-sdk";

const storage = createStorage({
  storage: window.localStorage, // or sessionStorage
  key: "fhevm", // optional prefix (default: "fhevm")
});
```

### Memory Storage

In-memory storage for testing or ephemeral sessions:

```tsx
import { createMemoryStorage } from "fhevm-sdk";

const storage = createMemoryStorage();
```

Memory storage:

- Data lost on page refresh
- Useful for testing
- No persistence between sessions

### No-op Storage

Does nothing, used for SSR or when persistence isn't needed:

```tsx
import { noopStorage } from "fhevm-sdk";

const config = createFhevmConfig({
  chains: [sepolia],
  storage: noopStorage,
});
```

## Default Behavior

If no storage is specified:

- **Browser**: Uses `localStorage` automatically
- **SSR mode** (`ssr: true`): Uses `noopStorage` automatically

```tsx
// Browser: uses localStorage
const config = createFhevmConfig({
  chains: [sepolia],
});

// SSR: uses noopStorage
const config = createFhevmConfig({
  chains: [sepolia],
  ssr: true,
});
```

## Custom Storage

Implement the `FhevmStorage` interface for custom storage:

```tsx
interface FhevmStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}
```

### Example: IndexedDB Storage

```tsx
const indexedDBStorage: FhevmStorage = {
  async getItem(key) {
    const db = await openDB();
    return db.get("fhevm", key);
  },
  async setItem(key, value) {
    const db = await openDB();
    await db.put("fhevm", value, key);
  },
  async removeItem(key) {
    const db = await openDB();
    await db.delete("fhevm", key);
  },
};
```

### Example: Encrypted Storage

```tsx
const encryptedStorage: FhevmStorage = {
  getItem(key) {
    const encrypted = localStorage.getItem(key);
    return encrypted ? decrypt(encrypted) : null;
  },
  setItem(key, value) {
    localStorage.setItem(key, encrypt(value));
  },
  removeItem(key) {
    localStorage.removeItem(key);
  },
};
```

## What's Stored?

The storage persists decryption signatures, which include:

- Public/private key pairs for decryption
- Signature from the user's wallet
- Contract addresses authorized for decryption
- Timestamp and duration

This allows decryption without re-signing on every request.
