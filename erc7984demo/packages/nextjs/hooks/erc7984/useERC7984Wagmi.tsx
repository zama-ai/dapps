"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeployedContractInfo } from "../helper";
import { useWagmiEthers } from "../wagmi/useWagmiEthers";
import { FhevmInstance } from "@fhevm-sdk";
import {
  getEncryptionMethod,
  useFHEDecrypt,
  useFHEEncryption,
  useInMemoryStorage,
} from "@fhevm-sdk";
import { ethers } from "ethers";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";
import { useReadContract, useAccount } from "wagmi";

/**
 * useERC7984Wagmi - ERC7984 Confidential Token hook for Wagmi
 *
 * What it does:
 * - Reads the current encrypted balance
 * - Decrypts the handle on-demand with useFHEDecrypt
 * - Encrypts inputs and writes transfers/mints
 */
export const useERC7984Wagmi = (parameters: {
  instance: FhevmInstance | undefined;
  initialMockChains?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialMockChains } = parameters;
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const { address } = useAccount();

  // Wagmi + ethers interop
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialMockChains);

  // Resolve deployed contract info once we know the chain
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: erc7984 } = useDeployedContractInfo({ contractName: "ERC7984Example", chainId: allowedChainId });

  // Simple status string for UX messages
  const [message, setMessage] = useState<string>("");

  type ERC7984Info = Contract<"ERC7984Example"> & { chainId?: number };

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // -------------
  // Helpers
  // -------------
  const hasContract = Boolean(erc7984?.address && erc7984?.abi);
  const hasProvider = Boolean(ethersReadonlyProvider);
  const hasSigner = Boolean(ethersSigner);

  const getContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(erc7984!.address, (erc7984 as ERC7984Info).abi, providerOrSigner);
  };

  // Read balance handle via wagmi
  const readResult = useReadContract({
    address: (hasContract ? (erc7984!.address as unknown as `0x${string}`) : undefined) as
      | `0x${string}`
      | undefined,
    abi: (hasContract ? ((erc7984 as ERC7984Info).abi as any) : undefined) as any,
    functionName: "confidentialBalanceOf" as const,
    args: [address as `0x${string}`],
    query: {
      enabled: Boolean(hasContract && hasProvider && address),
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

  // Decrypt balance
  const requests = useMemo(() => {
    if (!hasContract || !balanceHandle || balanceHandle === ethers.ZeroHash) return undefined;
    return [{ handle: balanceHandle, contractAddress: erc7984!.address } as const];
  }, [hasContract, erc7984?.address, balanceHandle]);

  const {
    canDecrypt,
    decrypt,
    isDecrypting,
    message: decMsg,
    results,
  } = useFHEDecrypt({
    instance,
    ethersSigner: ethersSigner as any,
    fhevmDecryptionSignatureStorage,
    chainId,
    requests,
  });

  useEffect(() => {
    if (decMsg) setMessage(decMsg);
  }, [decMsg]);

  const clearBalance = useMemo(() => {
    if (!balanceHandle) return undefined;
    if (balanceHandle === ethers.ZeroHash) return { handle: balanceHandle, clear: BigInt(0) } as const;
    const clear = results[balanceHandle];
    if (typeof clear === "undefined") return undefined;
    return { handle: balanceHandle, clear } as const;
  }, [balanceHandle, results]);

  const isDecrypted = Boolean(balanceHandle && clearBalance?.handle === balanceHandle);
  const decryptBalanceHandle = decrypt;

  // Mutations (transfer)
  const { encryptWith } = useFHEEncryption({ instance, ethersSigner: ethersSigner as any, contractAddress: erc7984?.address });
  const canTransfer = useMemo(
    () => Boolean(hasContract && instance && hasSigner && !isProcessing),
    [hasContract, instance, hasSigner, isProcessing],
  );

  const getEncryptionMethodForTransfer = () => {
    const functionAbi = erc7984?.abi.find(item => item.type === "function" && item.name === "confidentialTransfer");
    if (!functionAbi) return { method: undefined as string | undefined, error: "Function ABI not found for confidentialTransfer" } as const;
    if (!functionAbi.inputs)
      return { method: undefined as string | undefined, error: "No inputs found for confidentialTransfer" } as const;
    // Find the externalEuint64 input parameter (use the one with proof)
    const inputs = Array.isArray(functionAbi.inputs) ? functionAbi.inputs : [];
    const amountInput = inputs.find(input => input.internalType?.includes("externalEuint64"));
    if (!amountInput) return { method: undefined as string | undefined, error: "externalEuint64 input not found" } as const;
    return { method: getEncryptionMethod(amountInput.internalType || ""), error: undefined } as const;
  };

  const transferTokens = useCallback(
    async (to: string, amount: number) => {
      if (isProcessing || !canTransfer || amount <= 0) return;
      setIsProcessing(true);
      setMessage(`Starting transfer of ${amount} tokens to ${to}...`);
      try {
        const { method, error } = getEncryptionMethodForTransfer();
        if (!method) return setMessage(error ?? "Encryption method not found");

        setMessage(`Encrypting amount with ${method}...`);
        const enc = await encryptWith(builder => {
          (builder as any)[method](amount);
        });
        if (!enc) return setMessage("Encryption failed");

        const writeContract = getContract("write");
        if (!writeContract) return setMessage("Contract info or signer not available");

        // Get the specific function overload using getFunction to avoid ambiguity
        const transferFn = writeContract.getFunction("confidentialTransfer(address,bytes32,bytes)");
        const tx = await transferFn(to, enc.handles[0], enc.inputProof);
        setMessage("Waiting for transaction...");
        await tx.wait();
        setMessage(`Transfer of ${amount} tokens completed!`);
        refreshBalanceHandle();
      } catch (e) {
        setMessage(`Transfer failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, canTransfer, encryptWith, getContract, refreshBalanceHandle],
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
    // Wagmi-specific values
    chainId,
    accounts,
    isConnected,
    ethersSigner,
    address,
  };
};
