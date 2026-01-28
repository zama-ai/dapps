"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "../helper";
import { ethers } from "ethers";
import {
  useFhevmContext,
  useEthersSigner,
  useConfidentialTransfer,
  useConfidentialBalances,
  type TransferStatus,
} from "fhevm-sdk";
import { useAccount } from "wagmi";
import type { AllowedChainIds } from "~~/utils/helper/networks";

// Re-export TransferStatus for convenience
export type { TransferStatus };

/**
 * useERC7984Wagmi - ERC7984 Confidential Token hook for Wagmi
 *
 * What it does:
 * - Reads the current encrypted balance
 * - Decrypts the handle on-demand via useConfidentialBalances({ decrypt: true })
 * - Uses useConfidentialTransfer hook from SDK for transfers
 *
 * No parameters needed - everything is retrieved from FhevmProvider context.
 */
export const useERC7984Wagmi = () => {
  // Get everything from context
  const { instance, chainId: fhevmChainId } = useFhevmContext();
  const { address, isConnected, chain } = useAccount();
  const { signer: ethersSigner, provider: ethersProvider } = useEthersSigner();

  // Use wagmi chain ID if available, fall back to fhevm context
  const chainId = chain?.id ?? fhevmChainId;

  // Resolve deployed contract info once we know the chain
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: erc7984 } = useDeployedContractInfo({ contractName: "ERC7984Example", chainId: allowedChainId });

  // Simple status string for UX messages
  const [message, setMessage] = useState<string>("");

  // -------------
  // Helpers
  // -------------
  const hasContract = Boolean(erc7984?.address && erc7984?.abi);
  const hasProvider = Boolean(ethersProvider);

  // Read balance handle + auto-decrypt via SDK hook (single contract)
  const contractAddr = hasContract ? (erc7984!.address as `0x${string}`) : ("0x0000000000000000000000000000000000000000" as `0x${string}`);
  const {
    data: balanceData,
    isFetching: balanceFetching,
    error: balanceFetchError,
    refetch: refetchBalance,
    decryptAll,
    canDecrypt,
    isDecrypting,
    decryptError,
  } = useConfidentialBalances({
    contracts: [{ contractAddress: contractAddr }],
    account: address,
    enabled: Boolean(hasContract && hasProvider && address),
    decrypt: true,
  });
  const balanceHandle = balanceData[0]?.result;
  const clearValue = balanceData[0]?.decryptedValue;

  // Surface decrypt errors as messages
  useEffect(() => {
    if (decryptError) {
      console.error("[useERC7984Wagmi] Decryption error:", decryptError);
      setMessage(`Decryption error: ${decryptError}`);
    }
  }, [decryptError]);

  const canGetBalance = Boolean(hasContract && hasProvider && address && !balanceFetching);
  const isRefreshing = balanceFetching;
  const refreshBalanceHandle = useCallback(async () => {
    try {
      await refetchBalance();
    } catch {
      if (balanceFetchError) setMessage("ERC7984.confidentialBalanceOf() failed: " + balanceFetchError.message);
    }
  }, [refetchBalance, balanceFetchError]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Derive clearBalance from auto-decrypted data
  // ─────────────────────────────────────────────────────────────────────────────
  const contractAddress = erc7984?.address as `0x${string}` | undefined;

  const clearBalance = useMemo(() => {
    if (!balanceHandle) return undefined;
    if (balanceHandle === ethers.ZeroHash) return { handle: balanceHandle, clear: BigInt(0) } as const;
    if (clearValue === undefined) return undefined;
    return { handle: balanceHandle, clear: clearValue } as const;
  }, [balanceHandle, clearValue]);

  const isDecrypted = Boolean(balanceHandle && clearBalance?.handle === balanceHandle);
  const decryptBalanceHandle = decryptAll;

  // ─────────────────────────────────────────────────────────────────────────────
  // Transfer using useConfidentialTransfer hook from SDK
  // ─────────────────────────────────────────────────────────────────────────────
  const {
    transfer: sdkTransfer,
    status: transferStatus,
    isEncrypting,
    isPending: isProcessing,
    error: transferError,
    reset: resetTransfer,
  } = useConfidentialTransfer({
    contractAddress: contractAddress || ("0x0000000000000000000000000000000000000000" as `0x${string}`),
    functionName: "confidentialTransfer(address,bytes32,bytes)",
    onSuccess: () => {
      setMessage("Transfer completed successfully!");
      refreshBalanceHandle();
    },
    onError: (error) => {
      setMessage(`Transfer failed: ${error.message}`);
    },
  });

  const canTransfer = useMemo(
    () => Boolean(hasContract && instance && ethersSigner && !isProcessing && contractAddress),
    [hasContract, instance, ethersSigner, isProcessing, contractAddress],
  );

  // Wrapper function to match existing API
  const transferTokens = useCallback(
    async (to: string, amount: number): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      if (!canTransfer || amount <= 0) {
        return { success: false, error: "Cannot transfer at this time" };
      }

      setMessage(`Transferring ${amount} tokens...`);

      try {
        await sdkTransfer(to as `0x${string}`, BigInt(amount));

        // Check if transfer was successful (status will be 'success' if it worked)
        // Since the hook handles the flow, we return success here
        // The actual result is managed via status state
        return { success: true };
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        return { success: false, error: errorMsg };
      }
    },
    [canTransfer, sdkTransfer],
  );

  return {
    contractAddress: erc7984?.address,
    canDecrypt,
    canGetBalance,
    canTransfer,
    transferTokens,
    decryptBalanceHandle,
    refreshBalanceHandle,
    isDecrypted,
    message,
    clear: clearBalance?.clear,
    handle: balanceHandle,
    isDecrypting,
    isRefreshing,
    isProcessing,
    isEncrypting,
    transferStatus,
    decryptError,
    transferError,
    resetTransfer,
    // Wagmi-specific values
    chainId,
    isConnected,
    ethersSigner,
    address,
  };
};
