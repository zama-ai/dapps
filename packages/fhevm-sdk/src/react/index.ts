// Provider (wagmi-style API)
export { FhevmProvider, type FhevmProviderProps } from "./FhevmProvider";
export { FhevmContext, useFhevmContext, type FhevmContextValue, type FhevmStatus } from "./context";

// Hooks (wagmi-style API)
export { useEncrypt, type UseEncryptReturn, type EncryptedInput, type EncryptableType, type EncryptInput } from "./useEncrypt";
export { useDecrypt, type UseDecryptReturn, type DecryptRequest } from "./useDecrypt";
export { useFhevmStatus, type UseFhevmStatusReturn } from "./useFhevmStatus";
export { useFhevmClient, type UseFhevmClientReturn } from "./useFhevmClient";

// Legacy hooks (backward compatibility - consider migrating to new API)
export * from "./useFhevm";
export * from "./useFHEEncryption";
export * from "./useFHEDecrypt";
export * from "./useInMemoryStorage";

