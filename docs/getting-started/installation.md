# Installation

## Requirements

- Node.js >= 18
- React >= 18
- wagmi >= 2.0
- @tanstack/react-query >= 5.0

## Install the Package

```bash
pnpm add fhevm-sdk
```

Or with npm:

```bash
npm install fhevm-sdk
```

Or with yarn:

```bash
yarn add fhevm-sdk
```

## Peer Dependencies

fhevm-sdk requires the following peer dependencies:

```bash
pnpm add wagmi viem @tanstack/react-query ethers
```

## Cross-Origin Isolation

FHE operations require SharedArrayBuffer, which needs Cross-Origin Isolation headers. Configure your server to include:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

For Next.js, add to `next.config.ts`:

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
```

## Next Steps

Once installed, follow the [Quick Start](quick-start.md) guide to set up your first FHE application.
