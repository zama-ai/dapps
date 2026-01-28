// Config (wagmi-style API)
export {
  createFhevmConfig,
  createStorage,
  createMemoryStorage,
  noopStorage,
  type FhevmConfig,
  type FhevmConfigOptions,
  type FhevmStorage,
  type ConfigChainId,
} from "./config";

// Chains (wagmi-style API)
export * from "./chains/index";

// Core functionality
export * from "./core/index";
export * from "./storage/index";
export * from "./fhevmTypes";
export * from "./FhevmDecryptionSignature";

// EIP-1193 provider types (for use without ethers/viem/wagmi)
export type {
  Eip1193Provider,
  TypedDataDomain,
  TypedDataField,
  EIP712TypedData,
} from "./internal/eip1193";

// Encryption types
export type {
  FheTypeName,
  EncryptInput,
  EncryptResult,
  EncryptedOutput,
} from "./types/encryption";

// Transfer types
export type {
  TransferStatus,
  UseConfidentialTransferOptions,
  UseConfidentialTransferReturn,
} from "./types/transfer";

// Balance types
export type {
  BalanceStatus,
  ConfidentialBalanceConfig,
  ConfidentialBalanceResult,
  DecryptedValue,
  UseConfidentialBalancesOptions,
  UseConfidentialBalancesReturn,
} from "./types/balance";

// ABIs
export { ERC7984_ABI } from "./abi/index";

// React hooks and provider
export * from "./react/index";

