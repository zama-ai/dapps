# Storage Configuration

The `storage` prop on FhevmProvider controls how decryption signatures are cached. This avoids repeated signature requests from the user's wallet.

**Important:** No default storage is provided. You must explicitly choose a storage option.

## Built-in Storage Adapters

fhevm-sdk provides four built-in storage adapters:

```tsx
import {
  memoryStorage,         // In-memory, cleared on refresh
  localStorageAdapter,   // Persistent in localStorage
  sessionStorageAdapter, // Cleared when tab closes
  noOpStorage,           // No caching
} from "fhevm-sdk";
```

### Memory Storage (Recommended)

In-memory storage that clears on page refresh. Most secure option.

```tsx
import { FhevmProvider, memoryStorage } from "fhevm-sdk";

<FhevmProvider
  config={fhevmConfig}
  storage={memoryStorage}
  // ...other props
>
  {children}
</FhevmProvider>
```

Characteristics:
- Data cleared on page refresh
- Most secure (signatures don't persist)
- User signs once per session
- Good balance of security and UX

### localStorage Adapter

Persistent storage using browser's localStorage.

```tsx
import { FhevmProvider, localStorageAdapter } from "fhevm-sdk";

<FhevmProvider
  config={fhevmConfig}
  storage={localStorageAdapter}
  // ...other props
>
  {children}
</FhevmProvider>
```

Characteristics:
- Persists across sessions and page refreshes
- Better UX (fewer signature requests)
- Less secure (signatures persist on disk)
- Use only if you trust the user's device

### sessionStorage Adapter

Storage that clears when the browser tab closes.

```tsx
import { FhevmProvider, sessionStorageAdapter } from "fhevm-sdk";

<FhevmProvider
  config={fhevmConfig}
  storage={sessionStorageAdapter}
  // ...other props
>
  {children}
</FhevmProvider>
```

Characteristics:
- Persists across page refreshes within same tab
- Cleared when tab closes
- Middle ground between memory and localStorage
- Good for longer sessions

### No-op Storage

Disables caching entirely. User must sign for every decryption.

```tsx
import { FhevmProvider, noOpStorage } from "fhevm-sdk";

<FhevmProvider
  config={fhevmConfig}
  storage={noOpStorage}
  // ...other props
>
  {children}
</FhevmProvider>
```

Or simply pass `undefined`:

```tsx
<FhevmProvider
  config={fhevmConfig}
  storage={undefined}
  // ...other props
>
  {children}
</FhevmProvider>
```

Characteristics:
- No caching at all
- Maximum security
- Worst UX (sign every time)
- Use for highly sensitive operations

## Custom Storage

Implement the `GenericStringStorage` interface for custom storage:

```tsx
interface GenericStringStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}
```

### Example: IndexedDB Storage

```tsx
const indexedDBStorage: GenericStringStorage = {
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

<FhevmProvider
  config={fhevmConfig}
  storage={indexedDBStorage}
  // ...other props
>
  {children}
</FhevmProvider>
```

### Example: Encrypted Storage

```tsx
const encryptedStorage: GenericStringStorage = {
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

## Security Considerations

| Storage | Security | UX | Recommendation |
|---------|----------|----|--------------------|
| `memoryStorage` | High | Good | Default choice |
| `sessionStorageAdapter` | Medium | Better | Longer sessions |
| `localStorageAdapter` | Low | Best | Trusted devices only |
| `noOpStorage` | Highest | Poor | High-security apps |

For most applications, `memoryStorage` provides the best balance of security and user experience.
