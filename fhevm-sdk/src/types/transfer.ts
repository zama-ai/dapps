import type { ethers } from "ethers";

/**
 * Transfer status for tracking the confidential transfer flow.
 */
export type TransferStatus =
  | "idle"
  | "encrypting"
  | "signing"
  | "confirming"
  | "success"
  | "error";

/**
 * Options for useConfidentialTransfer hook.
 */
export interface UseConfidentialTransferOptions {
  /** The token contract address */
  contractAddress: `0x${string}`;
  /** Optional custom ABI (uses default ERC7984 ABI if not provided) */
  abi?: ethers.InterfaceAbi;
  /** Function name to call (default: "confidentialTransfer") */
  functionName?: string;
  /** Callback when transfer succeeds */
  onSuccess?: (txHash: string) => void;
  /** Callback when transfer fails */
  onError?: (error: Error) => void;
}

/**
 * Return type for useConfidentialTransfer hook.
 */
export interface UseConfidentialTransferReturn {
  /**
   * Execute a confidential transfer.
   * Handles encryption, signing, and confirmation automatically.
   *
   * @param to - Recipient address
   * @param amount - Amount to transfer (will be encrypted)
   */
  transfer: (to: `0x${string}`, amount: bigint) => Promise<void>;

  /** Current transfer status */
  status: TransferStatus;

  /** Whether currently encrypting the amount */
  isEncrypting: boolean;

  /** Whether waiting for user to sign the transaction */
  isSigning: boolean;

  /** Whether waiting for transaction confirmation */
  isConfirming: boolean;

  /** Whether the transfer was successful */
  isSuccess: boolean;

  /** Whether the transfer failed */
  isError: boolean;

  /** Whether any operation is pending */
  isPending: boolean;

  /** Error if status is 'error' */
  error: Error | null;

  /** Transaction hash after signing */
  txHash: string | undefined;

  /** Reset the hook state to idle */
  reset: () => void;
}
