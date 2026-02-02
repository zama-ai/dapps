# Types Reference

This page documents all TypeScript types exported by fhevm-sdk.

## Core Types

### FhevmStatus

FHEVM initialization status:

```tsx
type FhevmStatus = "idle" | "initializing" | "ready" | "error";
```

| Value          | Description                             |
| -------------- | --------------------------------------- |
| `'idle'`       | Not started, waiting for wallet connect |
| `'initializing'` | Instance is being created             |
| `'ready'`      | Ready for encryption/decryption         |
| `'error'`      | Initialization failed                   |

### FhevmConfig

Configuration object returned by `createFhevmConfig`:

```tsx
interface FhevmConfig {
  chains: readonly FhevmChain[];
  storage: FhevmStorage;
  getChain(chainId: number): FhevmChain | undefined;
  isMockChain(chainId: number): boolean;
  getMockRpcUrl(chainId: number): string | undefined;
}
```

### FhevmInstance

The FHEVM instance from the relayer SDK:

```tsx
interface FhevmInstance {
  createEncryptedInput(
    contractAddress: string,
    userAddress: string
  ): EncryptedInputBuilder;

  userDecrypt(
    requests: { handle: string; contractAddress: string }[],
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

## Encryption Types

### FheTypeName

Supported FHE type names (Solidity-style):

```tsx
type FheTypeName =
  | "bool"
  | "uint8"
  | "uint16"
  | "uint32"
  | "uint64"
  | "uint128"
  | "uint256"
  | "address";
```

### EncryptInput

Type-safe input for encryption. Uses discriminated unions to enforce correct value types at compile time:

```tsx
type EncryptInput =
  | { type: "bool"; value: boolean }
  | { type: "uint8"; value: number }
  | { type: "uint16"; value: number }
  | { type: "uint32"; value: number }
  | { type: "uint64"; value: bigint }
  | { type: "uint128"; value: bigint }
  | { type: "uint256"; value: bigint }
  | { type: "address"; value: `0x${string}` };
```

### EncryptResult

Result tuple from encryption - handles followed by proof:

```tsx
type EncryptResult<T extends readonly EncryptInput[]> = readonly [
  ...{ [K in keyof T]: Uint8Array },
  Uint8Array,
];
```

### EncryptedOutput

Raw encrypted output structure:

```tsx
type EncryptedOutput = {
  handles: Uint8Array[]; // Encrypted handles for contract
  inputProof: Uint8Array; // Proof for verification
};
```

## Decryption Types

### DecryptRequest

Request for decrypting an encrypted handle:

```tsx
interface DecryptRequest {
  handle: string;
  contractAddress: `0x${string}`;
}
```

### DecryptParams

Simplified parameters for single-handle decryption:

```tsx
interface DecryptParams {
  handle: string | undefined;
  contractAddress: `0x${string}` | undefined;
}
```

## Public Decryption Types

### PublicDecryptParams

Parameters for public decryption:

```tsx
interface PublicDecryptParams {
  handles: (string | undefined)[] | undefined;
}
```

### PublicDecryptResult

Result from public decryption including proof for contract callbacks:

```tsx
interface PublicDecryptResult {
  /** Decrypted values keyed by handle */
  clearValues: Record<string, string | bigint | boolean>;

  /** ABI-encoded clear values for contract callback */
  abiEncodedClearValues: `0x${string}`;

  /** Decryption proof for contract verification */
  decryptionProof: `0x${string}`;
}
```

## Chain Types

### FhevmChain

Base chain configuration:

```tsx
type FhevmChain = {
  id: number;
  name: string;
  network: string;
  isMock: boolean;
  rpcUrl?: string;
  aclAddress?: `0x${string}`;
  gatewayUrl?: string;
  kmsVerifierAddress?: `0x${string}`;
  inputVerifierAddress?: `0x${string}`;
  relayerUrl?: string;
};
```

### FhevmMockChain

Mock chain (development):

```tsx
type FhevmMockChain = FhevmChain & {
  isMock: true;
  rpcUrl: string; // required for mock chains
};
```

### FhevmProductionChain

Production chain with FHE infrastructure:

```tsx
type FhevmProductionChain = FhevmChain & {
  isMock: false;
  gatewayUrl: string;
  relayerUrl: string;
  aclAddress: `0x${string}`;
  kmsVerifierAddress: `0x${string}`;
  inputVerifierAddress: `0x${string}`;
};
```

## Storage Types

### FhevmStorage

Storage interface for decryption signatures:

```tsx
interface FhevmStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}
```

## Hook Return Types

### UseEncryptReturn

```tsx
interface UseEncryptReturn {
  isReady: boolean;
  encrypt: <T extends EncryptInput[]>(
    inputs: T,
    contractAddress: `0x${string}`
  ) => Promise<EncryptResult<T> | undefined>;
}
```

### UseDecryptReturn

```tsx
interface UseDecryptReturn {
  canDecrypt: boolean;
  decrypt: () => void;
  results: Record<string, string | bigint | boolean>;
  isDecrypting: boolean;
  message: string;
  error: string | null;
  clearError: () => void;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
}
```

### UsePublicDecryptReturn

```tsx
interface UsePublicDecryptReturn {
  canDecrypt: boolean;
  decrypt: () => void;
  decryptAsync: () => Promise<PublicDecryptResult | undefined>;
  result: PublicDecryptResult | undefined;
  clearValues: Record<string, string | bigint | boolean>;
  isDecrypting: boolean;
  message: string;
  error: string | null;
  clearError: () => void;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
}
```

### UseFhevmStatusReturn

```tsx
interface UseFhevmStatusReturn {
  status: FhevmStatus;
  error: Error | undefined;
  isReady: boolean;
  isInitializing: boolean;
  isError: boolean;
  chainId: number | undefined;
  isConnected: boolean;
}
```

### UseFhevmClientReturn

```tsx
interface UseFhevmClientReturn {
  instance: FhevmInstance | undefined;
  status: FhevmStatus;
  config: FhevmConfig;
  refresh: () => void;
  isReady: boolean;
}
```

### UseEthersSignerReturn

```tsx
interface UseEthersSignerReturn {
  signer: ethers.JsonRpcSigner | undefined;
  provider: ethers.BrowserProvider | undefined;
  isLoading: boolean;
  error: Error | null;
  isReady: boolean;
}
```

### UseDecryptedValueReturn

```tsx
interface UseDecryptedValueReturn {
  data: string | bigint | boolean | undefined;
  isCached: boolean;
  handle: string | undefined;
  contractAddress: string | undefined;
}
```

## Context Types

### FhevmContextValue

```tsx
interface FhevmContextValue {
  config: FhevmConfig;
  instance: FhevmInstance | undefined;
  status: FhevmStatus;
  error: Error | undefined;
  chainId: number | undefined;
  address: `0x${string}` | undefined;
  isConnected: boolean;
  refresh: () => void;
}
```

### FhevmProviderProps

```tsx
interface FhevmProviderProps {
  config: FhevmConfig;
  children: React.ReactNode;
  wagmi?: {
    isConnected: boolean;
    chainId: number | undefined;
    address: `0x${string}` | undefined;
  };
  provider?: any;
  autoInit?: boolean;
}
```
