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

import { FhevmProvider } from "fhevm-sdk";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { fhevmConfig } from "./config/fhevm";
import { wagmiConfig } from "./config/wagmi";

const queryClient = new QueryClient();

function FhevmWrapper({ children }) {
  const { isConnected, chainId, address } = useAccount();

  return (
    <FhevmProvider
      config={fhevmConfig}
      wagmi={{ isConnected, chainId, address }}
    >
      {children}
    </FhevmProvider>
  );
}

export function Providers({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <FhevmWrapper>{children}</FhevmWrapper>
      </QueryClientProvider>
    </WagmiProvider>
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

    // Encrypt the amount (defaults to uint64)
    const encrypted = await encrypt(BigInt(amount), contractAddress);
    if (!encrypted) return;

    // Use in contract call
    await writeContract({
      address: contractAddress,
      abi: tokenAbi,
      functionName: "transfer",
      args: [recipient, encrypted.handles[0], encrypted.inputProof],
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
import { useReadContract } from "wagmi";

function EncryptedToken({ contractAddress }) {
  const { isReady: fhevmReady } = useFhevmStatus();
  const { encrypt, isReady: encryptReady } = useEncrypt();

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

- [Configuration](../configuration/overview.md) - Learn about configuration options
- [useEncrypt](../hooks/use-encrypt.md) - Explore encryption options
- [useUserDecrypt](../hooks/use-user-decrypt.md) - Learn about decryption
