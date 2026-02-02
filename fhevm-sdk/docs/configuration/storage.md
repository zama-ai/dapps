# Storage Configuration

The `storage` prop on FhevmProvider controls how decryption signatures are cached. This avoids repeated signature requests from the user's wallet.

**Important:** No default storage is provided. You must explicitly choose a storage option.

## Quick Start

For most applications, use `localStorageAdapter` for the best user experience:

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

### localStorage Adapter (Recommended for UX)

Persistent storage using browser's localStorage. Best user experience.

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

**Characteristics:**
- Persists across sessions and page refreshes
- User signs once, then can decrypt for 24 hours without re-signing
- Keys stored with `fhevm:` prefix
- Best UX (minimal signature requests)

**When to use:**
- Consumer-facing dApps where UX is priority
- Apps where users decrypt frequently
- Trusted device environments

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

**Characteristics:**
- Persists across page refreshes within same tab
- Cleared when tab closes
- Keys stored with `fhevm:` prefix
- Good balance of security and UX

**When to use:**
- Apps where users have longer sessions
- When you want automatic cleanup on tab close
- Middle-ground security requirements

### Memory Storage

In-memory storage that clears on page refresh.

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

**Characteristics:**
- Data cleared on page refresh
- No persistence to disk
- User must re-sign after each page reload
- Most secure built-in option

**When to use:**
- High-security applications
- When signatures should never persist
- Testing and development

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

**Characteristics:**
- No caching at all
- User signs for every decrypt operation
- Maximum security, worst UX

**When to use:**
- Extremely sensitive operations
- When you need explicit user consent for each decrypt
- Compliance requirements that prohibit caching

## Custom Prefix

Create storage adapters with custom prefixes to isolate different apps or environments:

```tsx
import { createLocalStorageAdapter, createSessionStorageAdapter } from "fhevm-sdk";

// Isolate staging from production
const stagingStorage = createLocalStorageAdapter("fhevm-staging:");
const productionStorage = createLocalStorageAdapter("fhevm-prod:");

// Use in provider
<FhevmProvider
  config={fhevmConfig}
  storage={stagingStorage}
  // ...
>
```

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
import { openDB } from "idb";

const indexedDBStorage: GenericStringStorage = {
  async getItem(key) {
    const db = await openDB("fhevm-store", 1, {
      upgrade(db) {
        db.createObjectStore("signatures");
      },
    });
    return db.get("signatures", key);
  },
  async setItem(key, value) {
    const db = await openDB("fhevm-store", 1);
    await db.put("signatures", value, key);
  },
  async removeItem(key) {
    const db = await openDB("fhevm-store", 1);
    await db.delete("signatures", key);
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

For additional security, encrypt signatures before storing:

```tsx
import CryptoJS from "crypto-js";

const SECRET_KEY = "your-encryption-key"; // Derive from user password or secure source

const encryptedStorage: GenericStringStorage = {
  getItem(key) {
    const encrypted = localStorage.getItem(`fhevm-encrypted:${key}`);
    if (!encrypted) return null;
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  },
  setItem(key, value) {
    const encrypted = CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
    localStorage.setItem(`fhevm-encrypted:${key}`, encrypted);
  },
  removeItem(key) {
    localStorage.removeItem(`fhevm-encrypted:${key}`);
  },
};
```

### Example: React Native AsyncStorage

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";

const asyncStorageAdapter: GenericStringStorage = {
  async getItem(key) {
    return AsyncStorage.getItem(`fhevm:${key}`);
  },
  async setItem(key, value) {
    await AsyncStorage.setItem(`fhevm:${key}`, value);
  },
  async removeItem(key) {
    await AsyncStorage.removeItem(`fhevm:${key}`);
  },
};
```

## What's Stored?

The storage persists decryption signatures, which include:

- **Public/private key pairs** - For decrypting values
- **EIP-712 signature** - From the user's wallet
- **Contract addresses** - Authorized for decryption
- **Timestamp** - When the signature was created
- **Duration** - Validity period (default: 24 hours)

This allows decryption without re-signing on every request.

## Signature Validity

Signatures are valid for **24 hours** by default. After expiration:
- The cached signature is automatically ignored
- User will be prompted to sign again
- A new signature is generated and cached

## Clearing Cached Signatures

To manually clear cached signatures:

```tsx
// Clear all fhevm signatures from localStorage
Object.keys(localStorage)
  .filter(key => key.startsWith("fhevm:sig:"))
  .forEach(key => localStorage.removeItem(key));

// Clear from sessionStorage
Object.keys(sessionStorage)
  .filter(key => key.startsWith("fhevm:sig:"))
  .forEach(key => sessionStorage.removeItem(key));
```

Or provide a logout handler:

```tsx
function handleLogout() {
  // Clear fhevm signatures
  Object.keys(localStorage)
    .filter(key => key.startsWith("fhevm:"))
    .forEach(key => localStorage.removeItem(key));

  // Continue with logout...
}
```

## Security Comparison

| Storage | Persistence | Security | UX | Use Case |
|---------|-------------|----------|-----|----------|
| `localStorageAdapter` | Permanent | Low | Best | Consumer apps |
| `sessionStorageAdapter` | Tab lifetime | Medium | Good | Balanced apps |
| `memoryStorage` | Page lifetime | High | Fair | Security-first apps |
| `noOpStorage` | None | Highest | Poor | Max security |
| Custom encrypted | Configurable | Highest | Good | Enterprise apps |

## Troubleshooting

### Signature not being cached

Check the browser console for debug logs:
```
[LocalStorageAdapter] setItem: fhevm:sig:0x... -> 1234 chars
[LocalStorageAdapter] verified save: OK
```

If you see "window undefined (SSR)", the code is running on the server. Make sure your FhevmProvider is only rendered on the client.

### User prompted to sign on every page load

1. Verify you're using a persistent storage adapter (`localStorageAdapter` or `sessionStorageAdapter`)
2. Check that the storage is passed to FhevmProvider
3. Verify the signature hasn't expired (24 hour validity)
4. Check browser console for any storage errors

### Different signatures for different contracts

This is expected behavior. Each unique set of contract addresses requires its own signature. If your app interacts with multiple contracts, users may need to sign multiple times (once per contract set).
