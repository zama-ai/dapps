"use client";

import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { useEncrypt } from "./useEncrypt";
import { useFhevmContext } from "./context";
import { useEthersSigner } from "./useEthersSigner";
import { ERC7984_ABI } from "../abi/index";
import type {
  TransferStatus,
  UseConfidentialTransferOptions,
  UseConfidentialTransferReturn,
} from "../types/transfer";

// Re-export types for convenience
export type { TransferStatus, UseConfidentialTransferOptions, UseConfidentialTransferReturn };

/**
 * Hook for executing confidential ERC7984 token transfers.
 *
 * Encapsulates the full flow of:
 * 1. Encrypting the transfer amount
 * 2. Signing and submitting the transaction
 * 3. Waiting for confirmation
 *
 * @example
 * ```tsx
 * function TransferForm({ tokenAddress }) {
 *   const [to, setTo] = useState("");
 *   const [amount, setAmount] = useState("");
 *
 *   const {
 *     transfer,
 *     status,
 *     isEncrypting,
 *     isPending,
 *     error
 *   } = useConfidentialTransfer({
 *     contractAddress: tokenAddress,
 *     onSuccess: (hash) => {
 *       console.log("Transfer successful:", hash);
 *     },
 *   });
 *
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     await transfer(to as `0x${string}`, BigInt(amount));
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input value={to} onChange={e => setTo(e.target.value)} placeholder="Recipient" />
 *       <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
 *       <button disabled={isPending}>
 *         {isEncrypting ? "Encrypting..." : isPending ? "Transferring..." : "Transfer"}
 *       </button>
 *       {error && <p>{error.message}</p>}
 *     </form>
 *   );
 * }
 * ```
 */
export function useConfidentialTransfer(
  options: UseConfidentialTransferOptions
): UseConfidentialTransferReturn {
  const {
    contractAddress,
    abi = ERC7984_ABI,
    // Use full signature to avoid ethers overload ambiguity.
    functionName = "confidentialTransfer(address,bytes32,bytes)",
    onSuccess,
    onError,
  } = options;

  const { status: fhevmStatus } = useFhevmContext();
  const { encrypt, isReady: encryptReady } = useEncrypt();
  const { signer, isReady: signerReady } = useEthersSigner();

  const [status, setStatus] = useState<TransferStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>(undefined);

  // Derived state
  const isEncrypting = status === "encrypting";
  const isSigning = status === "signing";
  const isConfirming = status === "confirming";
  const isSuccess = status === "success";
  const isError = status === "error";
  const isPending =
    status !== "idle" && status !== "success" && status !== "error";

  // Reset function
  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(undefined);
  }, []);

  // Main transfer function
  const transfer = useCallback(
    async (to: `0x${string}`, amount: bigint): Promise<void> => {
      // Validate readiness
      if (fhevmStatus !== "ready" || !encryptReady) {
        const err = new Error("FHEVM not ready. Please wait for initialization.");
        setError(err);
        setStatus("error");
        onError?.(err);
        return;
      }

      if (!signerReady || !signer) {
        const err = new Error("Wallet not connected. Please connect your wallet.");
        setError(err);
        setStatus("error");
        onError?.(err);
        return;
      }

      try {
        // Step 1: Encrypt the amount
        setStatus("encrypting");
        setError(null);
        setTxHash(undefined);

        const encryptResult = await encrypt(
          [{ type: "uint64", value: amount }],
          contractAddress
        );

        if (!encryptResult) {
          throw new Error("Encryption failed - no result returned");
        }

        const [amountHandle, proof] = encryptResult;

        // Step 2: Sign and submit transaction
        setStatus("signing");

        const contract = new ethers.Contract(contractAddress, abi, signer);
        const tx = await contract[functionName](to, amountHandle, proof);

        setTxHash(tx.hash);

        // Step 3: Wait for confirmation
        setStatus("confirming");

        const receipt = await tx.wait();

        if (receipt.status === 0) {
          throw new Error("Transaction reverted");
        }

        // Success!
        setStatus("success");
        onSuccess?.(tx.hash);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Check if user rejected
        if (
          error.message.includes("User rejected") ||
          error.message.includes("user rejected") ||
          error.message.includes("ACTION_REJECTED")
        ) {
          setError(new Error("Transaction rejected by user"));
        } else {
          setError(error);
        }

        setStatus("error");
        onError?.(error);
        // Propagate so callers can surface errors immediately.
        throw error;
      }
    },
    [
      fhevmStatus,
      encryptReady,
      signerReady,
      signer,
      encrypt,
      contractAddress,
      abi,
      functionName,
      onSuccess,
      onError,
    ]
  );

  return {
    transfer,
    status,
    isEncrypting,
    isSigning,
    isConfirming,
    isSuccess,
    isError,
    isPending,
    error,
    txHash,
    reset,
  };
}
