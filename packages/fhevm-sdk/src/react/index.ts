// Provider (wagmi-style API)
export { FhevmProvider, type FhevmProviderProps } from "./FhevmProvider";
export { FhevmContext, useFhevmContext, type FhevmContextValue, type FhevmStatus } from "./context";

// Hooks (wagmi-style API)
export { useEncrypt, type UseEncryptReturn, type EncryptedInput, type EncryptableType, type EncryptInput, type EncryptMutationState, type EncryptMutationParams } from "./useEncrypt";
export { useUserDecrypt, type UseDecryptReturn, type DecryptRequest, type DecryptParams } from "./useUserDecrypt";
export { useFhevmStatus, type UseFhevmStatusReturn } from "./useFhevmStatus";
export { useFhevmClient, type UseFhevmClientReturn } from "./useFhevmClient";
export { useEthersSigner, type UseEthersSignerReturn } from "./useEthersSigner";

// Cache lookup hooks (TanStack Query powered)
export { useUserDecryptedValue, useUserDecryptedValues, type UseDecryptedValueReturn } from "./useUserDecryptedValue";

// TanStack Query utilities
export { fhevmQueryClient, createFhevmQueryClient } from "./queryClient";
export { fhevmKeys, type FhevmQueryKey } from "./queryKeys";

// Legacy hooks (backward compatibility - consider migrating to new API)
export * from "./useFhevm";
export * from "./useFHEEncryption";
export * from "./useFHEDecrypt";
export * from "./useInMemoryStorage";

