"use client";

import { type ReactNode, useMemo } from "react";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sepolia, hardhat } from "viem/chains";
import { createConfig as createWagmiConfig, http } from "wagmi";
import { WagmiProvider as StandardWagmiProvider, useAccount, useConnectorClient } from "wagmi";
import { FhevmProvider, createFhevmConfig, sepolia as fhevmSepolia, hardhatLocal, localStorageAdapter, type Eip1193Provider } from "@zama-fhe/sdk";
import { Header } from "~~/components/Header";
import scaffoldConfig from "~~/scaffold.config";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const isProduction = process.env.NODE_ENV === "production";
const { alchemyApiKey } = scaffoldConfig;

// RPC URLs
const sepoliaRpcUrl = alchemyApiKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`
  : "https://ethereum-sepolia-rpc.publicnode.com";

// Supported chains (Sepolia always, Hardhat in dev)
const supportedChains = isProduction ? [sepolia] : [sepolia, hardhat];

// Wagmi config for Privy
const privyWagmiConfig = isProduction
  ? createConfig({
      chains: [sepolia] as const,
      transports: { [sepolia.id]: http(sepoliaRpcUrl) },
    })
  : createConfig({
      chains: [sepolia, hardhat] as const,
      transports: {
        [sepolia.id]: http(sepoliaRpcUrl),
        [hardhat.id]: http("http://localhost:8545"),
      },
    });

// Standard Wagmi config (fallback when Privy not configured)
const standardWagmiConfig = isProduction
  ? createWagmiConfig({
      chains: [sepolia],
      transports: { [sepolia.id]: http(sepoliaRpcUrl) },
    })
  : createWagmiConfig({
      chains: [sepolia, hardhat],
      transports: {
        [sepolia.id]: http(sepoliaRpcUrl),
        [hardhat.id]: http("http://localhost:8545"),
      },
    });

// FHEVM config
const fhevmConfig = createFhevmConfig({
  chains: [fhevmSepolia, hardhatLocal],
});

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false },
  },
});

// Export wagmi config for use in other files if needed
export const wagmiConfig = privyWagmiConfig;

// ─────────────────────────────────────────────────────────────────────────────
// FHEVM Provider Wrapper (needs to be inside Wagmi to use useAccount)
// ─────────────────────────────────────────────────────────────────────────────

function FhevmWrapper({ children }: { children: ReactNode }) {
  const { address, chainId, isConnected } = useAccount();
  const { data: connectorClient } = useConnectorClient();

  // Get EIP-1193 provider from wagmi connector client or window.ethereum
  const provider = useMemo((): Eip1193Provider | undefined => {
    if (connectorClient?.transport) {
      return connectorClient.transport as Eip1193Provider;
    }
    if (typeof window !== "undefined") {
      return (window as any).ethereum;
    }
    return undefined;
  }, [connectorClient]);

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={provider}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={localStorageAdapter}
    >
      {children}
    </FhevmProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App Layout (Header + Main + Toaster)
// ─────────────────────────────────────────────────────────────────────────────

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ProgressBar height="3px" color="#FFD208" />
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="relative flex flex-col flex-1 z-10">
          <FhevmWrapper>{children}</FhevmWrapper>
        </main>
      </div>
      <Toaster />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Providers Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AppProviders - Single entry point for all app providers
 *
 * Provider hierarchy:
 * 1. Privy (auth) or Standard Wagmi (fallback)
 * 2. React Query
 * 3. Wagmi (wallet)
 * 4. FHEVM (encryption)
 * 5. App Layout (header, toaster)
 */
export function AppProviders({ children }: { children: ReactNode }) {
  // Warn if Privy not configured (dev only)
  if (!PRIVY_APP_ID && typeof window !== "undefined") {
    console.warn("NEXT_PUBLIC_PRIVY_APP_ID not set. Using standard wagmi provider.");
  }

  // Fallback to standard Wagmi when Privy not configured
  if (!PRIVY_APP_ID) {
    return (
      <StandardWagmiProvider config={standardWagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AppLayout>{children}</AppLayout>
        </QueryClientProvider>
      </StandardWagmiProvider>
    );
  }

  // Full Privy + Wagmi setup
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        loginMethods: ["wallet", "email"],
        supportedChains,
        defaultChain: sepolia,
        appearance: {
          showWalletLoginFirst: true,
          walletChainType: "ethereum-only",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={privyWagmiConfig}>
          <AppLayout>{children}</AppLayout>
        </PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
