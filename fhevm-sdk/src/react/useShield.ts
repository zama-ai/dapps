"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useFhevmContext } from "./context";
import { useEthersSigner } from "./useEthersSigner";
import { ERC20TOERC7984_ABI, ERC20_ABI } from "../abi/index";
import type {
  ShieldStatus,
  UseShieldOptions,
  UseShieldReturn,
} from "../types/shield";

// Re-export types for convenience
export type { ShieldStatus, UseShieldOptions, UseShieldReturn };

/**
 * Hook for shielding ERC20 tokens into confidential ERC7984 tokens.
 *
 * Handles the full flow:
 * 1. Check ERC20 allowance for the wrapper contract
 * 2. Approve if needed (prompts wallet signature)
 * 3. Call wrap() to convert ERC20 → ERC7984
 * 4. Wait for confirmation
 *
 * @example
 * ```tsx
 * function ShieldForm({ wrapperAddress }) {
 *   const [amount, setAmount] = useState("");
 *
 *   const {
 *     shield,
 *     status,
 *     isApproving,
 *     isWrapping,
 *     isPending,
 *     error,
 *     allowance,
 *   } = useShield({
 *     wrapperAddress,
 *     onSuccess: (hash) => console.log("Shielded!", hash),
 *   });
 *
 *   const handleSubmit = async () => {
 *     await shield(BigInt(amount));
 *   };
 *
 *   return (
 *     <div>
 *       <input value={amount} onChange={e => setAmount(e.target.value)} />
 *       <button onClick={handleSubmit} disabled={isPending}>
 *         {isApproving ? "Approving..." : isWrapping ? "Wrapping..." : "Shield"}
 *       </button>
 *       {error && <p>{error.message}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useShield(options: UseShieldOptions): UseShieldReturn {
  const {
    wrapperAddress,
    underlyingAddress: providedUnderlying,
    onSuccess,
    onError,
  } = options;

  const { address } = useFhevmContext();
  const { signer, provider, isReady } = useEthersSigner();

  const [status, setStatus] = useState<ShieldStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | undefined>();
  const [allowance, setAllowance] = useState<bigint | undefined>();
  const [underlyingAddress, setUnderlyingAddress] = useState<
    `0x${string}` | undefined
  >(providedUnderlying);

  // Zero address constant for comparison
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Sync state when providedUnderlying prop changes
  useEffect(() => {
    if (providedUnderlying) {
      setUnderlyingAddress(providedUnderlying);
    }
  }, [providedUnderlying]);

  // Fetch underlying address from wrapper if not provided
  useEffect(() => {
    // Skip if underlying is provided, provider not ready, or wrapper is zero/empty
    if (
      providedUnderlying ||
      !provider ||
      !wrapperAddress ||
      wrapperAddress === ZERO_ADDRESS
    ) {
      return;
    }

    let cancelled = false;
    const wrapper = new ethers.Contract(
      wrapperAddress,
      ERC20TOERC7984_ABI,
      provider
    );

    wrapper
      .underlying()
      .then((addr: string) => {
        if (!cancelled) setUnderlyingAddress(addr as `0x${string}`);
      })
      .catch((err: unknown) => {
        console.error("[useShield] Failed to fetch underlying address:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [providedUnderlying, provider, wrapperAddress]);

  // Fetch allowance
  const refetchAllowance = useCallback(async () => {
    if (!provider || !underlyingAddress || !address) return;

    try {
      const erc20 = new ethers.Contract(underlyingAddress, ERC20_ABI, provider);
      const allowanceValue = await erc20.allowance(address, wrapperAddress);
      setAllowance(BigInt(allowanceValue));
    } catch (err) {
      console.error("[useShield] Failed to fetch allowance:", err);
    }
  }, [provider, underlyingAddress, address, wrapperAddress]);

  // Refetch allowance when dependencies change
  useEffect(() => {
    refetchAllowance();
  }, [refetchAllowance]);

  // Reset function
  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(undefined);
  }, []);

  // Main shield function
  const shield = useCallback(
    async (amount: bigint, to?: `0x${string}`): Promise<void> => {
      if (!signer || !underlyingAddress || !address) {
        const err = new Error(
          "Not ready. Please connect your wallet and wait for initialization."
        );
        setError(err);
        setStatus("error");
        onError?.(err);
        return;
      }

      const recipient = to ?? address;

      try {
        // Step 1: Check allowance
        setStatus("checking-allowance");
        setError(null);
        setTxHash(undefined);

        const erc20 = new ethers.Contract(underlyingAddress, ERC20_ABI, signer);
        const currentAllowance = BigInt(
          await erc20.allowance(address, wrapperAddress)
        );

        // Step 2: Approve if needed
        if (currentAllowance < amount) {
          setStatus("approving");
          const approveTx = await erc20.approve(wrapperAddress, amount);
          await approveTx.wait();
          await refetchAllowance();
        }

        // Step 3: Wrap
        setStatus("wrapping");
        const wrapper = new ethers.Contract(
          wrapperAddress,
          ERC20TOERC7984_ABI,
          signer
        );
        const tx = await wrapper.wrap(recipient, amount);
        setTxHash(tx.hash);

        // Step 4: Confirm
        setStatus("confirming");
        const receipt = await tx.wait();

        if (receipt.status === 0) {
          throw new Error("Transaction reverted");
        }

        setStatus("success");
        onSuccess?.(tx.hash);
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
      signer,
      underlyingAddress,
      address,
      wrapperAddress,
      onSuccess,
      onError,
      refetchAllowance,
    ]
  );

  // Derived state
  const isApproving =
    status === "checking-allowance" || status === "approving";
  const isWrapping = status === "wrapping";
  const isPending =
    status !== "idle" && status !== "success" && status !== "error";
  const isSuccess = status === "success";
  const isError = status === "error";

  return {
    shield,
    status,
    isPending,
    isApproving,
    isWrapping,
    isSuccess,
    isError,
    error,
    txHash,
    reset,
    allowance,
    refetchAllowance,
  };
}
