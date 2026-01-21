"use client";

import { ReactNode, useMemo } from "react";
import { FhevmProvider, createFhevmConfig, sepolia as fhevmSepolia, hardhatLocal } from "fhevm-sdk";
import { useAccount } from "wagmi";

// Create FHEVM config with supported chains
const fhevmConfig = createFhevmConfig({
  chains: [fhevmSepolia, hardhatLocal],
});

interface FhevmSetupProps {
  children: ReactNode;
}

/**
 * FhevmSetup wraps children with FhevmProvider and handles wagmi integration.
 *
 * This component:
 * 1. Gets connection state from wagmi's useAccount
 * 2. Passes it to FhevmProvider for auto-initialization
 * 3. Provides FHEVM context to all children
 *
 * Place this inside your Wagmi/Privy provider hierarchy.
 */
export function FhevmSetup({ children }: FhevmSetupProps) {
  const { isConnected, chainId, address } = useAccount();

  // Get the provider from window.ethereum
  // The FhevmProvider will use this for FHE operations
  const provider = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return (window as any).ethereum;
  }, []);

  return (
    <FhevmProvider config={fhevmConfig} wagmi={{ isConnected, chainId, address }} provider={provider}>
      {children}
    </FhevmProvider>
  );
}
