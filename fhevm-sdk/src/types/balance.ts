import type { ethers } from "ethers";

export type BalanceStatus = "idle" | "loading" | "success" | "error";

export type DecryptedValue = string | bigint | boolean;

export interface ConfidentialBalanceConfig {
  contractAddress: `0x${string}`;
  account?: `0x${string}`;
  abi?: ethers.InterfaceAbi;
}

export interface ConfidentialBalanceResult {
  result: `0x${string}` | undefined;
  status: "success" | "failure" | "pending";
  error: Error | undefined;
  /** Populated when `decrypt: true` and decryption has completed for this handle */
  decryptedValue?: DecryptedValue;
}

export interface UseConfidentialBalancesOptions {
  contracts: readonly ConfidentialBalanceConfig[];
  account?: `0x${string}`;
  enabled?: boolean;
  /** Opt-in auto-decryption: composes useUserDecrypt + useUserDecryptedValues internally */
  decrypt?: boolean;
}

export interface UseConfidentialBalancesReturn {
  data: ConfidentialBalanceResult[];
  isLoading: boolean;
  isRefetching: boolean;
  isFetching: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  status: BalanceStatus;
  /** Trigger EIP-712 signing + decryption for all fetched handles */
  decryptAll: () => void;
  /** Whether decryption is currently in progress */
  isDecrypting: boolean;
  /** Whether decryption is ready to be called */
  canDecrypt: boolean;
  /** Error message if decryption failed */
  decryptError: string | null;
  /** Whether all fetched handles have been decrypted */
  isAllDecrypted: boolean;
  /** How many handles have been decrypted */
  decryptedCount: number;
}
