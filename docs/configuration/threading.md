# Threading & Performance

The FHE encryption operations in fhevm-sdk can run in two modes: **multi-threaded** (faster) or **single-threaded** (more compatible). This page explains the trade-offs and how to configure each.

## Overview

| Mode | Performance | Wallet Extensions | Setup |
|------|-------------|-------------------|-------|
| Multi-threaded | Fast (~1-2s) | May break | Requires COOP/COEP headers |
| Single-threaded | Slower (~6-7s) | Works normally | No special setup |

## Multi-Threaded Mode

Multi-threaded encryption uses `SharedArrayBuffer` and Web Workers to parallelize FHE operations, resulting in significantly faster encryption times.

### Requirements

Multi-threading requires **Cross-Origin Isolation**, which is enabled by setting specific HTTP headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Next.js Configuration

Add to `next.config.ts`:

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

### Vite Configuration

Add to `vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
```

### Nginx Configuration

```nginx
add_header Cross-Origin-Opener-Policy "same-origin";
add_header Cross-Origin-Embedder-Policy "require-corp";
```

### Trade-offs

**Pros:**
- Faster encryption (3-10x speedup)
- Better user experience for frequent operations

**Cons:**
- **Breaks wallet extensions**: MetaMask, Rabby, and other browser extension wallets may not work properly. The `same-origin` opener policy prevents the page from communicating with extension popups.
- **Breaks external resources**: Images, scripts, and iframes from other origins need `crossorigin` attributes or CORS headers.
- **iframe restrictions**: Your app cannot be embedded in iframes on other domains.

### Workarounds for Wallet Extensions

If you need multi-threaded mode but also want wallet extensions to work:

1. **Use WalletConnect**: Mobile wallets via WalletConnect are not affected by COOP/COEP.
2. **Use injected wallets carefully**: Some wallets like Coinbase Wallet may work better than others.
3. **Provide a fallback**: Detect if extensions are broken and suggest alternatives to users.

## Single-Threaded Mode

Single-threaded mode runs all FHE operations on the main thread. It's slower but has no compatibility issues.

### Configuration

No configuration needed - this is the default when Cross-Origin Isolation headers are not present.

### Trade-offs

**Pros:**
- **Full compatibility**: All wallet extensions (MetaMask, Rabby, etc.) work normally
- **No header configuration**: Works out of the box
- **No iframe/embed restrictions**: Your app can be embedded anywhere

**Cons:**
- Slower encryption times (typically 1-3 seconds vs 100-500ms)
- May block the UI briefly during encryption (consider showing a loading state)

### Best Practices for Single-Threaded Mode

1. **Show loading states**: Always indicate when encryption is in progress
2. **Batch operations**: Encrypt multiple values in one call when possible
3. **Async/await**: Use `await` to avoid blocking user interactions

```tsx
const handleTransfer = async () => {
  setIsEncrypting(true);
  try {
    const [amountHandle, proof] = await encrypt([
      { type: "uint64", value: amount },
    ], contractAddress);
    // ... continue with transaction
  } finally {
    setIsEncrypting(false);
  }
};
```

## Checking Threading Status

You can check if multi-threading is available at runtime:

```typescript
const isMultiThreaded = typeof SharedArrayBuffer !== "undefined"
  && window.crossOriginIsolated === true;

console.log(`Threading mode: ${isMultiThreaded ? "multi" : "single"}`);
```

## Recommendation

| Use Case | Recommended Mode |
|----------|------------------|
| dApp with browser wallet extensions | Single-threaded |
| dApp with WalletConnect only | Multi-threaded |
| High-frequency encryption operations | Multi-threaded |
| Maximum compatibility | Single-threaded |
| Development/testing | Either (single is simpler) |

For most dApps that need to support MetaMask and other browser extensions, **single-threaded mode** is recommended despite the performance trade-off. Users expect their wallet extensions to work, and the encryption delay is acceptable for typical transaction flows.
