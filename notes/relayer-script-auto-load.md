# Relayer Script Auto-Loading Plan

## Goal

Hide the relayer SDK script loading from users. Currently users must add:

```tsx
<Script src="https://cdn.zama.org/relayer-sdk-js/0.4.0-4/relayer-sdk-js.umd.cjs" strategy="beforeInteractive" />
```

After this change, users just use `FhevmProvider` and everything works automatically.

## Design Decisions

1. **Version locked in SDK** - Users don't interact with relayer-sdk directly, so version is internal
2. **Always load script** - Load on all networks including mock (simpler, consistent behavior)
3. **Show errors** - Expose script load failures via `useFhevmStatus`

## Implementation

### 1. Create Script Loader Hook

**File:** `packages/fhevm-sdk/src/internal/useRelayerScript.ts`

```ts
const RELAYER_SDK_VERSION = "0.4.0-4";
const RELAYER_SDK_URL = `https://cdn.zama.org/relayer-sdk-js/${RELAYER_SDK_VERSION}/relayer-sdk-js.umd.cjs`;

type ScriptStatus = "idle" | "loading" | "ready" | "error";

export function useRelayerScript(): {
  status: ScriptStatus;
  error: Error | undefined;
} {
  const [status, setStatus] = useState<ScriptStatus>("idle");
  const [error, setError] = useState<Error>();

  useEffect(() => {
    // Skip on server
    if (typeof window === "undefined") return;

    // Already loaded
    if (window.relayerSDK) {
      setStatus("ready");
      return;
    }

    // Check if script tag already exists (another provider instance)
    const existingScript = document.querySelector(
      `script[src="${RELAYER_SDK_URL}"]`
    );

    if (existingScript) {
      // Script exists, wait for it
      const handleLoad = () => setStatus("ready");
      const handleError = () => {
        setStatus("error");
        setError(new Error("Failed to load relayer SDK"));
      };

      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);

      // Check if already loaded
      if (window.relayerSDK) {
        setStatus("ready");
      }

      return () => {
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
      };
    }

    // Load script
    setStatus("loading");
    const script = document.createElement("script");
    script.src = RELAYER_SDK_URL;
    script.async = false; // Ensure it blocks

    script.onload = () => {
      setStatus("ready");
    };

    script.onerror = () => {
      setStatus("error");
      setError(new Error(`Failed to load relayer SDK from ${RELAYER_SDK_URL}`));
    };

    document.head.appendChild(script);
  }, []);

  return { status, error };
}
```

### 2. Update FhevmProvider

**File:** `packages/fhevm-sdk/src/react/FhevmProvider.tsx`

Integrate script loading into provider initialization:

```tsx
export function FhevmProvider({ config, children, ...props }: FhevmProviderProps) {
  const { status: scriptStatus, error: scriptError } = useRelayerScript();

  // Don't initialize FHEVM until script is ready
  const canInitialize = scriptStatus === "ready";

  // Combine script error with other errors
  const combinedError = scriptError ?? fhevmError;

  // Status reflects script loading state
  const effectiveStatus = scriptStatus === "loading"
    ? "initializing"
    : scriptStatus === "error"
      ? "error"
      : fhevmStatus;

  // ... rest of provider logic, but only run init when canInitialize
}
```

### 3. Update Context Status

The `FhevmStatus` type already includes the states we need:
- `"idle"` - Not started
- `"initializing"` - Script loading or FHEVM initializing
- `"ready"` - Everything ready
- `"error"` - Script or FHEVM error

### 4. Export Version Constant

**File:** `packages/fhevm-sdk/src/internal/constants.ts`

```ts
export const RELAYER_SDK_VERSION = "0.4.0-4";
export const RELAYER_SDK_URL = `https://cdn.zama.org/relayer-sdk-js/${RELAYER_SDK_VERSION}/relayer-sdk-js.umd.cjs`;
```

### 5. Update Example App

**File:** `packages/erc7984example/app/layout.tsx`

Remove the Script import:

```diff
- import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head />
      <body>
-       <Script src="..." strategy="beforeInteractive" />
        <ThemeProvider>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Files to Modify

| File | Action |
|------|--------|
| `src/internal/constants.ts` | Add RELAYER_SDK_VERSION and URL |
| `src/internal/useRelayerScript.ts` | Create new hook |
| `src/react/FhevmProvider.tsx` | Integrate script loading |
| `packages/erc7984example/app/layout.tsx` | Remove Script tag |
| `docs/provider/fhevm-provider.md` | Update docs (no script needed) |
| `docs/getting-started/installation.md` | Remove script step |

## Type Declaration

Add global type for `window.relayerSDK`:

```ts
// src/types/global.d.ts
declare global {
  interface Window {
    relayerSDK?: typeof import("@zama-fhe/relayer-sdk/web");
  }
}
```

## Testing Checklist

- [ ] Script loads automatically on first render
- [ ] Multiple provider instances don't load script twice
- [ ] Script error surfaces via `useFhevmStatus`
- [ ] Works with mock chains
- [ ] Works with production chains
- [ ] SSR doesn't break (script only loads client-side)
- [ ] Example app works without manual Script tag

## Error States

Users can check for script loading errors:

```tsx
function App() {
  const { status, error, isError } = useFhevmStatus();

  if (isError) {
    return <div>Failed to load FHE: {error?.message}</div>;
  }

  if (status === "initializing") {
    return <div>Loading FHE...</div>;
  }

  return <MyApp />;
}
```

## Migration

Users upgrading from previous version:

1. Remove `<Script src="...relayer-sdk..." />` from layout
2. That's it - FhevmProvider handles everything now

## Notes

- Script is loaded with `async: false` to ensure it's available before FHEVM init
- Version is locked in SDK - when updating, bump SDK version
- Script is always loaded even for mock chains (simpler, avoids edge cases)
