# Quick Start

This guide walks you through setting up fhevm-sdk in a React application.

## 1. Create Configuration

First, create a configuration with your supported chains:

```tsx
// config/fhevm.ts
import { createFhevmConfig, sepolia, hardhatLocal } from "fhevm-sdk";

export const fhevmConfig = createFhevmConfig({
  chains: [sepolia, hardhatLocal],
});
```

## 2. Set Up Providers

Wrap your application with the FhevmProvider after WagmiProvider:

```tsx
// app/providers.tsx
"use client";

import { FhevmProvider, memoryStorage, type Eip1193Provider } from "fhevm-sdk";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccount, useConnectorClient } from "wagmi";
import { fhevmConfig } from "./config/fhevm";
import { wagmiConfig } from "./config/wagmi";

const queryClient = new QueryClient();

function FhevmWrapper({ children }: { children: React.ReactNode }) {
  const { address, chainId, isConnected } = useAccount();
  const { data: connectorClient } = useConnectorClient();

  // Get EIP-1193 provider from wagmi connector
  const provider = connectorClient?.transport as Eip1193Provider | undefined;

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={provider}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage}
    >
      {children}
    </FhevmProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <FhevmWrapper>{children}</FhevmWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Without wagmi

If you're not using wagmi, pass the provider directly:

```tsx
import { FhevmProvider, memoryStorage, type Eip1193Provider } from "fhevm-sdk";

function FhevmWrapper({ children }: { children: React.ReactNode }) {
  const { address, chainId, isConnected } = useWallet(); // Your wallet hook

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={window.ethereum as Eip1193Provider}
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

## 3. Encrypt Values

Use the `useEncrypt` hook to encrypt values for contract calls:

```tsx
import { useEncrypt } from "fhevm-sdk";

function TransferForm({ contractAddress }) {
  const { encrypt, isReady } = useEncrypt();
  const [amount, setAmount] = useState("");

  const handleTransfer = async () => {
    if (!isReady) return;

    // Encrypt the amount - returns [handle, proof] for easy destructuring
    const [amountHandle, proof] = await encrypt([
      { type: "uint64", value: BigInt(amount) },
    ], contractAddress);

    if (!amountHandle) return;

    // Use in contract call
    await writeContract({
      address: contractAddress,
      abi: tokenAbi,
      functionName: "transfer",
      args: [recipient, amountHandle, proof],
    });
  };

  return (
    <div>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />
      <button onClick={handleTransfer} disabled={!isReady}>
        Transfer
      </button>
    </div>
  );
}
```

## 4. Decrypt Values

Use the `useUserDecrypt` hook to decrypt encrypted values:

```tsx
import { useUserDecrypt } from "fhevm-sdk";

function BalanceDisplay({ handle, contractAddress }) {
  const { decrypt, results, isDecrypting, canDecrypt } = useUserDecrypt({
    handle,
    contractAddress,
  });

  const balance = handle ? results[handle] : undefined;

  return (
    <div>
      <p>Balance: {balance?.toString() ?? "Encrypted"}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        {isDecrypting ? "Decrypting..." : "Decrypt"}
      </button>
    </div>
  );
}
```

## 5. Check Status

Use the `useFhevmStatus` hook for conditional rendering:

```tsx
import { useFhevmStatus } from "fhevm-sdk";

function FHEStatus() {
  const { status, isReady, isInitializing, isError, error } = useFhevmStatus();

  if (isInitializing) {
    return <p>Initializing FHE...</p>;
  }

  if (isError) {
    return <p>Error: {error?.message}</p>;
  }

  if (!isReady) {
    return <p>Connect your wallet to continue</p>;
  }

  return <p>FHE Ready!</p>;
}
```

## Complete Example

Here's a complete component combining encryption, decryption, and status:

```tsx
import { useEncrypt, useUserDecrypt, useFhevmStatus } from "fhevm-sdk";
import { useReadContract, useWriteContract } from "wagmi";

function EncryptedToken({ contractAddress, userAddress }) {
  const { isReady: fhevmReady } = useFhevmStatus();
  const { encrypt } = useEncrypt();
  const { writeContract } = useWriteContract();

  // Read encrypted balance handle from contract
  const { data: balanceHandle } = useReadContract({
    address: contractAddress,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [userAddress],
  });

  // Set up decryption
  const { decrypt, results, canDecrypt, isDecrypting } = useUserDecrypt({
    handle: balanceHandle,
    contractAddress,
  });

  const decryptedBalance = balanceHandle ? results[balanceHandle] : undefined;

  // Transfer function with encryption
  const handleTransfer = async (recipient: `0x${string}`, amount: bigint) => {
    const [amountHandle, proof] = await encrypt([
      { type: "uint64", value: amount },
    ], contractAddress);

    if (!amountHandle) return;

    writeContract({
      address: contractAddress,
      abi: tokenAbi,
      functionName: "transfer",
      args: [recipient, amountHandle, proof],
    });
  };

  if (!fhevmReady) {
    return <p>Loading FHE...</p>;
  }

  return (
    <div>
      <h2>My Balance</h2>
      <p>
        {decryptedBalance !== undefined
          ? `${decryptedBalance} tokens`
          : "Encrypted"}
      </p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        {isDecrypting ? "Decrypting..." : "Reveal Balance"}
      </button>
    </div>
  );
}
```

## Next Steps

- [FhevmProvider](../provider/fhevm-provider.md) - Learn about provider configuration
- [Storage Configuration](../configuration/storage.md) - Configure signature caching
- [useEncrypt](../hooks/use-encrypt.md) - Explore encryption options
- [useUserDecrypt](../hooks/use-user-decrypt.md) - Learn about decryption
