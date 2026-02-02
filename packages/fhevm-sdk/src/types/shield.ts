/**
 * Types for shield (ERC20 → ERC7984) and unshield (ERC7984 → ERC20) operations.
 */

export type ShieldStatus =
  | "idle"
  | "checking-allowance"
  | "approving"
  | "wrapping"
  | "confirming"
  | "success"
  | "error";

export type UnshieldStatus =
  | "idle"
  | "encrypting"
  | "signing"
  | "confirming"
  | "decrypting"
  | "finalizing"
  | "success"
  | "error";

export interface UseShieldOptions {
  /** ERC7984 wrapper contract address */
  wrapperAddress: `0x${string}`;
  /** Underlying ERC20 token address (optional, will be fetched if not provided) */
  underlyingAddress?: `0x${string}`;
  /** Callback on successful shield */
  onSuccess?: (txHash: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseShieldReturn {
  /** Execute the shield operation (ERC20 → ERC7984) */
  shield: (amount: bigint, to?: `0x${string}`) => Promise<void>;
  /** Current status */
  status: ShieldStatus;
  /** Whether currently processing */
  isPending: boolean;
  /** Whether checking/requesting allowance */
  isApproving: boolean;
  /** Whether wrapping */
  isWrapping: boolean;
  /** Whether operation succeeded */
  isSuccess: boolean;
  /** Whether operation errored */
  isError: boolean;
  /** Error if any */
  error: Error | null;
  /** Transaction hash if available */
  txHash: string | undefined;
  /** Reset state */
  reset: () => void;
  /** Current allowance for wrapper */
  allowance: bigint | undefined;
  /** Refetch allowance */
  refetchAllowance: () => Promise<void>;
}

export interface UseUnshieldOptions {
  /** ERC7984 wrapper contract address */
  wrapperAddress: `0x${string}`;
  /** Callback on successful unshield initiation */
  onSuccess?: (txHash: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface UseUnshieldReturn {
  /** Execute the unshield operation (ERC7984 → ERC20) */
  unshield: (amount: bigint, to?: `0x${string}`) => Promise<void>;
  /** Current status */
  status: UnshieldStatus;
  /** Whether currently processing */
  isPending: boolean;
  /** Whether encrypting the amount */
  isEncrypting: boolean;
  /** Whether signing the transaction */
  isSigning: boolean;
  /** Whether waiting for public decryption proof */
  isDecrypting: boolean;
  /** Whether finalizing the unwrap */
  isFinalizing: boolean;
  /** Whether operation succeeded */
  isSuccess: boolean;
  /** Whether operation errored */
  isError: boolean;
  /** Error if any */
  error: Error | null;
  /** Unwrap transaction hash if available */
  txHash: string | undefined;
  /** Finalize transaction hash if available */
  finalizeTxHash: string | undefined;
  /** Reset state */
  reset: () => void;
}
