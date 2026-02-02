"use client";

import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { useFhevmContext } from "./context";
import { useEthersSigner } from "./useEthersSigner";
import { useEncrypt } from "./useEncrypt";
import { ERC20TOERC7984_ABI } from "../abi/index";
import type {
  UnshieldStatus,
  UseUnshieldOptions,
  UseUnshieldReturn,
} from "../types/shield";

// Re-export types for convenience
export type { UnshieldStatus, UseUnshieldOptions, UseUnshieldReturn };

// UnwrapRequested event signature
const UNWRAP_REQUESTED_TOPIC = ethers.id("UnwrapRequested(address,bytes32)");

/**
 * Hook for unshielding confidential ERC7984 tokens back to ERC20.
 *
 * Handles the complete flow:
 * 1. Encrypt the amount using FHE
 * 2. Call unwrap(from, to, encryptedAmount, inputProof) - burns confidential tokens
 * 3. Wait for transaction confirmation
 * 4. Request public decryption of the burnt amount
 * 5. Call finalizeUnwrap() with the decryption proof - releases ERC20 tokens
 *
 * @example
 * ```tsx
 * function UnshieldForm({ wrapperAddress }) {
 *   const [amount, setAmount] = useState("");
 *
 *   const {
 *     unshield,
 *     status,
 *     isEncrypting,
 *     isSigning,
 *     isDecrypting,
 *     isFinalizing,
 *     isPending,
 *     error,
 *   } = useUnshield({
 *     wrapperAddress,
 *     onSuccess: (hash) => console.log("Unshield complete!", hash),
 *   });
 *
 *   const handleSubmit = async () => {
 *     await unshield(BigInt(amount));
 *   };
 *
 *   return (
 *     <div>
 *       <input value={amount} onChange={e => setAmount(e.target.value)} />
 *       <button onClick={handleSubmit} disabled={isPending}>
 *         {isEncrypting ? "Encrypting..." :
 *          isSigning ? "Sign in wallet..." :
 *          isDecrypting ? "Getting proof..." :
 *          isFinalizing ? "Finalizing..." :
 *          "Unshield"}
 *       </button>
 *       {error && <p>{error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUnshield(options: UseUnshieldOptions): UseUnshieldReturn {
  const { wrapperAddress, onSuccess, onError } = options;

  const { status: fhevmStatus, address, instance } = useFhevmContext();
  const { encrypt, isReady: encryptReady } = useEncrypt();
  const { signer, isReady: signerReady } = useEthersSigner();

  const [status, setStatus] = useState<UnshieldStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [finalizeTxHash, setFinalizeTxHash] = useState<string | undefined>();

  // Reset function
  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(undefined);
    setFinalizeTxHash(undefined);
  }, []);

  // Main unshield function
  const unshield = useCallback(
    async (amount: bigint, to?: `0x${string}`): Promise<void> => {
      if (fhevmStatus !== "ready" || !encryptReady || !instance) {
        const err = new Error(
          "FHEVM not ready. Please wait for initialization."
        );
        setError(err);
        setStatus("error");
        onError?.(err);
        return;
      }

      if (!signerReady || !signer || !address) {
        const err = new Error(
          "Wallet not connected. Please connect your wallet."
        );
        setError(err);
        setStatus("error");
        onError?.(err);
        return;
      }

      const recipient = to ?? address;

      try {
        // Step 1: Encrypt the amount
        setStatus("encrypting");
        setError(null);
        setTxHash(undefined);
        setFinalizeTxHash(undefined);

        const encryptResult = await encrypt(
          [{ type: "uint64", value: amount }],
          wrapperAddress
        );

        if (!encryptResult) {
          throw new Error("Encryption failed - no result returned");
        }

        const [amountHandle, proof] = encryptResult;

        // Step 2: Sign and submit unwrap transaction
        setStatus("signing");

        const wrapper = new ethers.Contract(
          wrapperAddress,
          ERC20TOERC7984_ABI,
          signer
        );

        // unwrap(address from, address to, bytes32 encryptedAmount, bytes inputProof)
        const tx = await wrapper[
          "unwrap(address,address,bytes32,bytes)"
        ](address, recipient, amountHandle, proof);

        setTxHash(tx.hash);

        // Step 3: Wait for confirmation and get the burnt amount from event
        setStatus("confirming");
        const receipt = await tx.wait();

        if (receipt.status === 0) {
          throw new Error("Unwrap transaction reverted");
        }

        // Parse UnwrapRequested event to get the burntAmount handle
        const unwrapEvent = receipt.logs.find(
          (log: ethers.Log) =>
            log.address.toLowerCase() === wrapperAddress.toLowerCase() &&
            log.topics[0] === UNWRAP_REQUESTED_TOPIC
        );

        if (!unwrapEvent) {
          throw new Error("UnwrapRequested event not found in transaction");
        }

        // Decode the event: UnwrapRequested(address indexed receiver, euint64 amount)
        // topics[0] = event signature
        // topics[1] = indexed receiver address
        // data = non-indexed amount (bytes32)
        const burntAmountHandle = unwrapEvent.data as `0x${string}`;

        console.log("[useUnshield] Unwrap confirmed, burntAmount handle:", burntAmountHandle);

        // Step 4: Request public decryption
        setStatus("decrypting");

        const decryptResult = await instance.publicDecrypt([burntAmountHandle]);

        if (!decryptResult || !decryptResult.clearValues) {
          throw new Error("Public decryption failed - no result returned");
        }

        const cleartextAmount = decryptResult.clearValues[burntAmountHandle];
        if (cleartextAmount === undefined) {
          throw new Error("Decrypted value not found for burnt amount handle");
        }

        console.log("[useUnshield] Decrypted amount:", cleartextAmount);

        // Step 5: Finalize the unwrap
        setStatus("finalizing");

        const finalizeTx = await wrapper.finalizeUnwrap(
          burntAmountHandle,
          BigInt(cleartextAmount.toString()),
          decryptResult.decryptionProof
        );

        setFinalizeTxHash(finalizeTx.hash);

        const finalizeReceipt = await finalizeTx.wait();

        if (finalizeReceipt.status === 0) {
          throw new Error("Finalize transaction reverted");
        }

        // Success - ERC20 tokens have been released
        setStatus("success");
        onSuccess?.(finalizeTx.hash);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));

        // Check if user rejected
        if (
          e.message.includes("User rejected") ||
          e.message.includes("user rejected") ||
          e.message.includes("ACTION_REJECTED")
        ) {
          setError(new Error("Transaction rejected by user"));
        } else {
          setError(e);
        }

        setStatus("error");
        onError?.(e);
      }
    },
    [
      fhevmStatus,
      encryptReady,
      instance,
      signerReady,
      signer,
      address,
      encrypt,
      wrapperAddress,
      onSuccess,
      onError,
    ]
  );

  // Derived state
  const isEncrypting = status === "encrypting";
  const isSigning = status === "signing";
  const isDecrypting = status === "decrypting";
  const isFinalizing = status === "finalizing";
  const isPending =
    status !== "idle" && status !== "success" && status !== "error";
  const isSuccess = status === "success";
  const isError = status === "error";

  return {
    unshield,
    status,
    isPending,
    isEncrypting,
    isSigning,
    isDecrypting,
    isFinalizing,
    isSuccess,
    isError,
    error,
    txHash,
    finalizeTxHash,
    reset,
  };
}
