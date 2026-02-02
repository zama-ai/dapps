// Provider (wagmi-style API)
export { FhevmProvider, type FhevmProviderProps } from "./FhevmProvider";
export { FhevmContext, useFhevmContext, type FhevmContextValue, type FhevmStatus } from "./context";

// Hooks (wagmi-style API)
export { useEncrypt, type UseEncryptReturn, type EncryptInput, type EncryptResult, type EncryptedOutput, type FheTypeName } from "./useEncrypt";
export { useUserDecrypt, type UseDecryptReturn, type DecryptRequest, type DecryptParams } from "./useUserDecrypt";
export { usePublicDecrypt, type UsePublicDecryptReturn, type PublicDecryptResult, type PublicDecryptParams } from "./usePublicDecrypt";
export { useFhevmStatus, type UseFhevmStatusReturn } from "./useFhevmStatus";
export { useFhevmClient, type UseFhevmClientReturn } from "./useFhevmClient";
export { useEthersSigner, type UseEthersSignerReturn } from "./useEthersSigner";
export { useConfidentialTransfer, type UseConfidentialTransferOptions, type UseConfidentialTransferReturn, type TransferStatus } from "./useConfidentialTransfer";
export { useConfidentialBalances, type ConfidentialBalanceConfig, type ConfidentialBalanceResult, type DecryptedValue, type UseConfidentialBalancesOptions, type UseConfidentialBalancesReturn, type BalanceStatus } from "./useConfidentialBalances";
export { useShield, type ShieldStatus, type UseShieldOptions, type UseShieldReturn } from "./useShield";
export { useUnshield, type UnshieldStatus, type UseUnshieldOptions, type UseUnshieldReturn } from "./useUnshield";

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

