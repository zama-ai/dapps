"use client";

import { useCallback, useMemo } from "react";
import { useDeployedContractInfo } from "../helper";
import { useWagmiEthers } from "../wagmi/useWagmiEthers";
import type { Address } from "@zama-fhe/react-sdk";
import { useConfidentialBalance, useConfidentialTransfer } from "@zama-fhe/react-sdk";
import { useAccount } from "wagmi";
import type { AllowedChainIds } from "~~/utils/helper/networks";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as Address;

export const useERC7984Wagmi = () => {
  const { address } = useAccount();
  const { chainId, isConnected, ethersSigner } = useWagmiEthers({ 31337: "http://localhost:8545" });

  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: erc7984 } = useDeployedContractInfo({ contractName: "ERC7984Example", chainId: allowedChainId });
  const contractAddress = erc7984?.address as Address | undefined;
  const tokenAddress = contractAddress ?? ZERO_ADDRESS;

  const balance = useConfidentialBalance({ tokenAddress, handleRefetchInterval: 15_000 });

  // Don't pass onSuccess — the SDK's internal onSuccess handler has a bug where
  // context.client is sometimes undefined. Instead we refetch manually after mutateAsync.
  const transfer = useConfidentialTransfer({ tokenAddress });

  const canTransfer = useMemo(
    () => Boolean(contractAddress && address && !transfer.isPending),
    [contractAddress, address, transfer.isPending],
  );

  const transferTokens = useCallback(
    async (to: string, amount: number) => {
      if (!canTransfer || amount <= 0) return;
      try {
        await transfer.mutateAsync({ to: to as Address, amount: BigInt(amount) });
      } catch (e: any) {
        // The SDK's onSuccess handler can throw "Cannot read properties of undefined (reading 'client')"
        // when TanStack Query's mutation context is missing. The transfer itself succeeded if we get here
        // from onSuccess — swallow that specific error and refetch.
        if (!e?.message?.includes("client")) throw e;
      }
      balance.refetch();
    },
    [canTransfer, transfer, balance],
  );

  const message = useMemo(() => {
    if (transfer.error) return `Transfer failed: ${transfer.error.message}`;
    if (balance.error) return `Balance error: ${balance.error.message}`;
    return "";
  }, [transfer.error, balance.error]);

  return {
    contractAddress,
    canTransfer,
    transferTokens,
    refreshBalance: balance.refetch,
    isDecrypted: balance.data !== undefined,
    message,
    clear: balance.data,
    handle: balance.handleQuery?.data,
    isRefreshing: balance.isFetching,
    isProcessing: transfer.isPending,
    chainId,
    isConnected,
    ethersSigner,
    address,
  };
};
