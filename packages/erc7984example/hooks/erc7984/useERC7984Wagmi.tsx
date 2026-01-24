"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useDeployedContractInfo } from "../helper";
import { ethers } from "ethers";
import { useFhevmContext, useUserDecrypt, useEncrypt, useEthersSigner } from "fhevm-sdk";
import { useAccount, useReadContract } from "wagmi";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";

// Transfer status for detailed UI feedback
export type TransferStatus =
  | "idle"
  | "encrypting"
  | "signing"
  | "confirming"
  | "success"
  | "error";

/**
 * useERC7984Wagmi - ERC7984 Confidential Token hook for Wagmi
 *
 * What it does:
 * - Reads the current encrypted balance
 * - Decrypts the handle on-demand with useUserDecrypt (new simplified API)
 * - Encrypts inputs and writes transfers with useEncrypt
 *
 * No parameters needed - everything is retrieved from FhevmProvider context.
 */
export const useERC7984Wagmi = () => {
  // Get everything from context
  const { instance, chainId: fhevmChainId, isConnected: fhevmConnected } = useFhevmContext();
  const { address, isConnected, chain } = useAccount();
  const { signer: ethersSigner, provider: ethersProvider } = useEthersSigner();

  // Use wagmi chain ID if available, fall back to fhevm context
  const chainId = chain?.id ?? fhevmChainId;

  // Resolve deployed contract info once we know the chain
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: erc7984 } = useDeployedContractInfo({ contractName: "ERC7984Example", chainId: allowedChainId });

  // Simple status string for UX messages
  const [message, setMessage] = useState<string>("");

  type ERC7984Info = Contract<"ERC7984Example"> & { chainId?: number };

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [transferStatus, setTransferStatus] = useState<TransferStatus>("idle");
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);

  // Track previous decrypting state to detect transitions
  const prevDecryptingRef = useRef<boolean>(false);

  // -------------
  // Helpers
  // -------------
  const hasContract = Boolean(erc7984?.address && erc7984?.abi);
  const hasProvider = Boolean(ethersProvider);
  const hasSigner = Boolean(ethersSigner);

  const getContract = useCallback(
    (mode: "read" | "write") => {
      if (!hasContract) return undefined;
      const providerOrSigner = mode === "read" ? ethersProvider : ethersSigner;
      if (!providerOrSigner) return undefined;
      return new ethers.Contract(erc7984!.address, (erc7984 as ERC7984Info).abi, providerOrSigner);
    },
    [hasContract, ethersProvider, ethersSigner, erc7984],
  );

  // Read balance handle via wagmi
  const readResult = useReadContract({
    address: (hasContract ? (erc7984!.address as unknown as `0x${string}`) : undefined) as `0x${string}` | undefined,
    abi: (hasContract ? ((erc7984 as ERC7984Info).abi as any) : undefined) as any,
    functionName: "confidentialBalanceOf" as const,
    args: [address as `0x${string}`],
    chainId: chainId,
    query: {
      enabled: Boolean(hasContract && hasProvider && address && chainId),
      refetchOnWindowFocus: false,
    },
  });

  const balanceHandle = useMemo(() => (readResult.data as string | undefined) ?? undefined, [readResult.data]);
  const canGetBalance = Boolean(hasContract && hasProvider && address && !readResult.isFetching);
  const isRefreshing = readResult.isFetching;
  const refreshBalanceHandle = useCallback(async () => {
    const res = await readResult.refetch();
    if (res.error) setMessage("ERC7984.confidentialBalanceOf() failed: " + (res.error as Error).message);
  }, [readResult]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Decrypt balance using new simplified useUserDecrypt hook
  // ─────────────────────────────────────────────────────────────────────────────
  const contractAddress = erc7984?.address as `0x${string}` | undefined;
  const decryptHandle = balanceHandle && balanceHandle !== ethers.ZeroHash ? balanceHandle : undefined;

  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    message: decMsg,
    results,
    error: decryptError,
  } = useUserDecrypt({
    handle: decryptHandle,
    contractAddress: hasContract ? contractAddress : undefined,
  });

  useEffect(() => {
    if (decMsg) setMessage(decMsg);
  }, [decMsg]);

  // Log decryption errors for debugging
  useEffect(() => {
    if (decryptError) {
      console.error("[useERC7984Wagmi] Decryption error:", decryptError);
      setMessage(`Decryption error: ${decryptError}`);
    }
  }, [decryptError]);

  const clearBalance = useMemo(() => {
    if (!balanceHandle) return undefined;
    if (balanceHandle === ethers.ZeroHash) return { handle: balanceHandle, clear: BigInt(0) } as const;
    const clear = results[balanceHandle];
    if (typeof clear === "undefined") return undefined;
    return { handle: balanceHandle, clear } as const;
  }, [balanceHandle, results]);

  const isDecrypted = Boolean(balanceHandle && clearBalance?.handle === balanceHandle);
  const decryptBalanceHandle = decrypt;

  // ─────────────────────────────────────────────────────────────────────────────
  // Encrypt using new simplified useEncrypt hook
  // ─────────────────────────────────────────────────────────────────────────────
  const { encrypt, isReady: encryptReady } = useEncrypt();

  const canTransfer = useMemo(
    () => Boolean(hasContract && instance && hasSigner && encryptReady && !isProcessing),
    [hasContract, instance, hasSigner, encryptReady, isProcessing],
  );

  // Simplified transferTokens using new encrypt() with default uint64 type
  const transferTokens = useCallback(
    async (to: string, amount: number): Promise<{ success: boolean; error?: string; txHash?: string }> => {
      if (isProcessing || !canTransfer || amount <= 0 || !contractAddress) {
        return { success: false, error: "Cannot transfer at this time" };
      }
      setIsProcessing(true);
      setTransferStatus("encrypting");
      setIsEncrypting(true);
      setMessage(`Encrypting ${amount} tokens...`);

      try {
        // Encrypt amount using new tuple-return API
        const result = await encrypt([
          { type: "uint64", value: BigInt(amount) },
        ], contractAddress);
        setIsEncrypting(false);

        if (!result) {
          setTransferStatus("error");
          setMessage("Encryption failed");
          return { success: false, error: "Encryption failed" };
        }
        const [amountHandle, proof] = result;

        const writeContract = getContract("write");
        if (!writeContract) {
          setTransferStatus("error");
          setMessage("Contract info or signer not available");
          return { success: false, error: "Contract not available" };
        }

        // Get the specific function overload using getFunction to avoid ambiguity
        setTransferStatus("signing");
        setMessage("Please sign the transaction in your wallet...");

        const transferFn = writeContract.getFunction("confidentialTransfer(address,bytes32,bytes)");
        const tx = await transferFn(to, amountHandle, proof);

        setTransferStatus("confirming");
        setMessage("Transaction submitted. Waiting for confirmation...");

        const receipt = await tx.wait();
        setTransferStatus("success");
        setMessage(`Successfully transferred ${amount} tokens!`);
        refreshBalanceHandle();

        return { success: true, txHash: receipt.hash };
      } catch (e) {
        setTransferStatus("error");
        setIsEncrypting(false);
        const errorMsg = e instanceof Error ? e.message : String(e);

        // Handle user rejection
        if (errorMsg.includes("user rejected") || errorMsg.includes("User denied")) {
          setMessage("Transaction cancelled by user");
          return { success: false, error: "Transaction cancelled" };
        }

        setMessage(`Transfer failed: ${errorMsg}`);
        return { success: false, error: errorMsg };
      } finally {
        setIsProcessing(false);
        // Reset status after a delay
        setTimeout(() => {
          setTransferStatus("idle");
        }, 3000);
      }
    },
    [isProcessing, canTransfer, contractAddress, encrypt, getContract, refreshBalanceHandle],
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
    // Wagmi-specific values
    chainId,
    isConnected,
    ethersSigner,
    address,
  };
};
