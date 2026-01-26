# useFhevmClient

Hook for direct access to the FHEVM instance.

## Import

```tsx
import { useFhevmClient } from "fhevm-sdk";
```

## Usage

```tsx
function AdvancedComponent() {
  const { instance, status, config, refresh, isReady } = useFhevmClient();

  if (isReady && instance) {
    // Direct instance access for advanced operations
  }
}
```

## Returns

| Property   | Type                         | Description              |
| ---------- | ---------------------------- | ------------------------ |
| `instance` | `FhevmInstance \| undefined` | FHEVM instance           |
| `status`   | `FhevmStatus`                | Current status           |
| `config`   | `FhevmConfig`                | Configuration object     |
| `refresh`  | `() => void`                 | Re-initialize instance   |
| `isReady`  | `boolean`                    | Whether instance is ready |

## When to Use

Use `useFhevmClient` when you need:

- Direct access to the FHEVM instance
- To build custom encryption/decryption logic
- Manual control over initialization
- Access to the config object

For most use cases, prefer the higher-level hooks:

- [useEncrypt](use-encrypt.md) for encryption
- [useUserDecrypt](use-user-decrypt.md) for decryption
- [useFhevmStatus](use-fhevm-status.md) for status checks

## Examples

### Custom Encryption Logic

```tsx
function CustomEncryption({ contractAddress }) {
  const { instance, isReady } = useFhevmClient();
  const { address } = useAccount();

  const encryptCustom = async () => {
    if (!instance || !address) return;

    // Direct instance access
    const input = instance.createEncryptedInput(contractAddress, address);
    input.add64(100n);
    input.add64(200n);

    const encrypted = await input.encrypt();
    return encrypted;
  };
}
```

### Manual Refresh

```tsx
function RefreshButton() {
  const { refresh, status } = useFhevmClient();

  return (
    <button onClick={refresh} disabled={status === "initializing"}>
      {status === "initializing" ? "Initializing..." : "Refresh FHE"}
    </button>
  );
}
```

### Config Access

```tsx
function ChainInfo() {
  const { config, instance } = useFhevmClient();
  const { chainId } = useAccount();

  const chain = chainId ? config.getChain(chainId) : undefined;
  const isMock = chainId ? config.isMockChain(chainId) : false;

  return (
    <div>
      <p>Chain: {chain?.name ?? "Unknown"}</p>
      <p>Mode: {isMock ? "Mock (Development)" : "Production"}</p>
      <p>Instance: {instance ? "Ready" : "Not initialized"}</p>
    </div>
  );
}
```

### Building Custom Hooks

```tsx
function useCustomFheOperation() {
  const { instance, isReady } = useFhevmClient();
  const { address } = useAccount();

  const customOperation = useCallback(
    async (contractAddress: `0x${string}`, value: bigint) => {
      if (!instance || !address) {
        throw new Error("FHEVM not ready");
      }

      // Custom logic using instance
      const input = instance.createEncryptedInput(contractAddress, address);
      input.add64(value);
      return input.encrypt();
    },
    [instance, address]
  );

  return { customOperation, isReady };
}
```

## Instance Methods

The FHEVM instance provides:

```tsx
interface FhevmInstance {
  // Create encrypted input builder
  createEncryptedInput(
    contractAddress: string,
    userAddress: string
  ): EncryptedInputBuilder;

  // Decrypt values (requires signature)
  userDecrypt(
    requests: DecryptRequest[],
    privateKey: string,
    publicKey: string,
    signature: string,
    contractAddresses: string[],
    userAddress: string,
    startTimestamp: number,
    durationDays: number
  ): Promise<Record<string, any>>;
}
```

Note: For most use cases, the `useEncrypt` and `useUserDecrypt` hooks provide a simpler API that handles these operations automatically.
