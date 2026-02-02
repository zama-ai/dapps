# useEthersSigner (Deprecated)

> **Deprecated:** This hook is deprecated and will be removed in a future version. The SDK now uses EIP-1193 providers directly, eliminating the need for ethers.js signers.

## Migration Guide

The SDK no longer requires ethers.js. Instead, pass an EIP-1193 provider directly to FhevmProvider:

### Before (Deprecated)

```tsx
import { useEthersSigner } from "fhevm-sdk";

function MyComponent() {
  const { signer, isReady } = useEthersSigner();
  // Use signer for operations
}
```

### After (Recommended)

The SDK handles signing internally using the provider passed to FhevmProvider:

```tsx
import { FhevmProvider, memoryStorage, type Eip1193Provider } from "fhevm-sdk";
import { useAccount, useConnectorClient } from "wagmi";

function FhevmWrapper({ children }) {
  const { address, chainId, isConnected } = useAccount();
  const { data: connectorClient } = useConnectorClient();

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={connectorClient?.transport as Eip1193Provider}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage}
    >
      {children}
    </FhevmProvider>
  );
}
```

### Using viem or ethers directly

If you still need a signer for your own operations (outside of fhevm-sdk), create one directly:

#### With viem

```tsx
import { createWalletClient, custom } from "viem";

const client = createWalletClient({
  chain: mainnet,
  transport: custom(window.ethereum),
});
```

#### With ethers

```tsx
import { BrowserProvider } from "ethers";

const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
```

## Why This Change?

The SDK was restructured to:

1. **Remove hard dependencies** - No longer requires ethers.js
2. **Work with any wallet** - Uses the standard EIP-1193 interface
3. **Smaller bundle size** - No ethers.js bundled with the SDK
4. **Library agnostic** - Works with wagmi, viem, ethers, or raw providers

## What Replaces It?

The SDK now uses `eth_signTypedData_v4` directly via the EIP-1193 provider for all signing operations. This is handled internally - you don't need to manage signers yourself.

For decryption, simply use:

```tsx
import { useUserDecrypt } from "fhevm-sdk";

function Balance({ handle, contractAddress }) {
  // Signing is handled automatically using the provider from FhevmProvider
  const { decrypt, results } = useUserDecrypt({
    handle,
    contractAddress,
  });

  return (
    <div>
      <p>{results[handle]?.toString() ?? "Encrypted"}</p>
      <button onClick={decrypt}>Decrypt</button>
    </div>
  );
}
```
