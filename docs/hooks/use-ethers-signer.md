# useEthersSigner

Hook to get an ethers.js signer from the connected wallet.

## Import

```tsx
import { useEthersSigner } from "fhevm-sdk";
```

## Usage

```tsx
function SignerInfo() {
  const { signer, provider, isLoading, error, isReady } = useEthersSigner();

  if (isLoading) return <p>Loading signer...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!isReady) return <p>Connect wallet</p>;

  return <p>Signer ready</p>;
}
```

## Returns

| Property    | Type                                  | Description                     |
| ----------- | ------------------------------------- | ------------------------------- |
| `signer`    | `ethers.JsonRpcSigner \| undefined`   | Ethers signer                   |
| `provider`  | `ethers.BrowserProvider \| undefined` | Ethers provider                 |
| `isLoading` | `boolean`                             | Whether signer is being created |
| `error`     | `Error \| null`                       | Error if creation failed        |
| `isReady`   | `boolean`                             | Whether signer is ready         |

## How It Works

1. Reads wallet state from FhevmProvider context
2. Creates an ethers.js BrowserProvider from `window.ethereum`
3. Gets a signer for the connected address
4. Recreates signer when chain changes

## Examples

### Basic Usage

```tsx
function WalletInfo() {
  const { signer, isReady } = useEthersSigner();

  const showAddress = async () => {
    if (!signer) return;
    const address = await signer.getAddress();
    console.log("Address:", address);
  };

  return (
    <button onClick={showAddress} disabled={!isReady}>
      Show Address
    </button>
  );
}
```

### Signing Messages

```tsx
function MessageSigner() {
  const { signer, isReady } = useEthersSigner();
  const [signature, setSignature] = useState<string>();

  const signMessage = async () => {
    if (!signer) return;

    const sig = await signer.signMessage("Hello, FHE!");
    setSignature(sig);
  };

  return (
    <div>
      <button onClick={signMessage} disabled={!isReady}>
        Sign Message
      </button>
      {signature && <p>Signature: {signature.slice(0, 20)}...</p>}
    </div>
  );
}
```

### With useUserDecrypt

Pass the signer to useUserDecrypt for explicit control:

```tsx
function Balance({ handle, contractAddress }) {
  const { signer } = useEthersSigner();

  const { decrypt, results } = useUserDecrypt(
    [{ handle, contractAddress }],
    signer // explicit signer
  );

  return (
    <div>
      <p>{results[handle]?.toString() ?? "Encrypted"}</p>
      <button onClick={decrypt}>Decrypt</button>
    </div>
  );
}
```

### Provider Access

```tsx
function BlockNumber() {
  const { provider } = useEthersSigner();
  const [blockNumber, setBlockNumber] = useState<number>();

  useEffect(() => {
    if (!provider) return;

    provider.getBlockNumber().then(setBlockNumber);
  }, [provider]);

  return <p>Block: {blockNumber ?? "..."}</p>;
}
```

## Chain Switching

The hook automatically recreates the signer when the chain changes:

```tsx
function ChainAwareSigner() {
  const { signer, isLoading } = useEthersSigner();
  const { chainId } = useAccount();

  // signer is recreated when chainId changes
  // isLoading will be true during recreation

  return (
    <div>
      <p>Chain: {chainId}</p>
      <p>Signer: {isLoading ? "Updating..." : signer ? "Ready" : "Not available"}</p>
    </div>
  );
}
```

## When to Use

Use `useEthersSigner` when you need:

- An ethers.js signer for signing operations
- To pass an explicit signer to `useUserDecrypt`
- Access to the ethers provider
- Custom ethers.js operations

Note: Most hooks (like `useUserDecrypt`) auto-detect the signer from `window.ethereum`, so explicit signer usage is often optional.
