"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

/**
 * Hook to detect if the connected wallet is a smart contract wallet (e.g., Coinbase Smart Wallet, Safe, etc.)
 *
 * Smart wallets produce EIP-1271 signatures which are incompatible with some services
 * that expect standard 65-byte ECDSA signatures (like Zama's FHE relayer).
 */
export const useIsSmartWallet = () => {
  const [isSmartWallet, setIsSmartWallet] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Only access wagmi hooks after mount to avoid SSR issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // These hooks are safe to call but we only use their values after mount
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  useEffect(() => {
    // Don't run during SSR or before mount
    if (!isMounted) return;

    async function checkSmartWallet() {
      if (!address || !isConnected || !publicClient) {
        setIsSmartWallet(false);
        return;
      }

      setIsChecking(true);
      try {
        // Check if the address has contract code
        const code = await publicClient.getCode({ address });
        // If code exists and is not empty (0x), it's a smart wallet
        const isSmart = Boolean(code && code !== "0x" && code.length > 2);
        setIsSmartWallet(isSmart);
      } catch (error) {
        console.error("[useIsSmartWallet] Error checking wallet type:", error);
        setIsSmartWallet(false);
      } finally {
        setIsChecking(false);
      }
    }

    checkSmartWallet();
  }, [isMounted, address, isConnected, publicClient]);

  return { isSmartWallet, isChecking };
};
