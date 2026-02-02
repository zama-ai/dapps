"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  useFhevmStatus,
  useFhevmContext,
  useEthersSigner,
  ERC20TOERC7984_ABI,
} from "fhevm-sdk";
import { useAccount } from "wagmi";
import { notification } from "~~/utils/helper/notification";

interface PendingUnwrap {
  wrapperAddress: `0x${string}`;
  burntAmountHandle: `0x${string}`;
  tokenSymbol: string;
}

// Known pending unwraps - add yours here
const PENDING_UNWRAPS: PendingUnwrap[] = [
  {
    wrapperAddress: "0x593E77e7E2bEe748aa27942E1f2069b5B6902625",
    burntAmountHandle: "0x1913621ab522d1a67caaf9b1f60986fc10c38974d4ff0000000000aa36a70500",
    tokenSymbol: "cTEST1",
  },
];

type RecoveryStatus = "idle" | "decrypting" | "finalizing" | "success" | "error";

export const RecoverUnwrap = () => {
  const { isConnected } = useAccount();
  const { isReady: fhevmIsReady } = useFhevmStatus();
  const { instance } = useFhevmContext();
  const { signer } = useEthersSigner();

  const [status, setStatus] = useState<RecoveryStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recoveredAmount, setRecoveredAmount] = useState<string | null>(null);

  const recoverUnwrap = useCallback(async (pending: PendingUnwrap) => {
    if (!instance || !signer) {
      notification.error("Please connect wallet and wait for FHE initialization");
      return;
    }

    setStatus("decrypting");
    setError(null);
    setRecoveredAmount(null);

    try {
      console.log("[RecoverUnwrap] Getting public decryption for handle:", pending.burntAmountHandle);

      // Step 1: Get public decryption
      const decryptResult = await instance.publicDecrypt([pending.burntAmountHandle]);

      if (!decryptResult || !decryptResult.clearValues) {
        throw new Error("Public decryption failed - no result returned");
      }

      const cleartextAmount = decryptResult.clearValues[pending.burntAmountHandle];
      if (cleartextAmount === undefined) {
        throw new Error("Decrypted value not found for burnt amount handle");
      }

      console.log("[RecoverUnwrap] Decrypted amount:", cleartextAmount);
      notification.info(`Decrypted amount: ${cleartextAmount}`);

      // Step 2: Finalize the unwrap
      setStatus("finalizing");

      const wrapper = new ethers.Contract(
        pending.wrapperAddress,
        ERC20TOERC7984_ABI,
        signer
      );

      const finalizeTx = await wrapper.finalizeUnwrap(
        pending.burntAmountHandle,
        BigInt(cleartextAmount.toString()),
        decryptResult.decryptionProof
      );

      console.log("[RecoverUnwrap] Finalize tx:", finalizeTx.hash);
      notification.info(`Finalizing... tx: ${finalizeTx.hash}`);

      const receipt = await finalizeTx.wait();

      if (receipt.status === 0) {
        throw new Error("Finalize transaction reverted");
      }

      setStatus("success");
      setRecoveredAmount(cleartextAmount.toString());
      notification.success(`Recovered ${cleartextAmount} tokens!`);

    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error("[RecoverUnwrap] Error:", e);
      setError(e.message);
      setStatus("error");
      notification.error(`Recovery failed: ${e.message}`);
    }
  }, [instance, signer]);

  if (!isConnected) {
    return null;
  }

  if (PENDING_UNWRAPS.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-amber-50 border border-amber-200">
      <h3 className="font-semibold text-amber-800 mb-2">⚠️ Pending Unwrap Recovery</h3>
      <p className="text-sm text-amber-700 mb-4">
        You have pending unwrap requests that need to be finalized to receive your ERC20 tokens.
      </p>

      {PENDING_UNWRAPS.map((pending, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-white border border-amber-100 mb-2">
          <div>
            <span className="font-medium">{pending.tokenSymbol}</span>
            <span className="text-xs text-gray-500 ml-2">
              {pending.burntAmountHandle.slice(0, 10)}...{pending.burntAmountHandle.slice(-8)}
            </span>
          </div>
          <button
            onClick={() => recoverUnwrap(pending)}
            disabled={!fhevmIsReady || status === "decrypting" || status === "finalizing"}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "decrypting" ? "Decrypting..." :
             status === "finalizing" ? "Finalizing..." :
             status === "success" ? "✓ Recovered" :
             "Recover"}
          </button>
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}

      {recoveredAmount && (
        <p className="text-sm text-green-600 mt-2">
          Successfully recovered {recoveredAmount} tokens! Refresh to see updated balance.
        </p>
      )}
    </div>
  );
};
