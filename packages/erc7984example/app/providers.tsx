"use client";

import { type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sepolia } from "viem/chains";
import { createConfig as createWagmiConfig, http } from "wagmi";
import { WagmiProvider as StandardWagmiProvider } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";

type Props = {
  children: ReactNode;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

// Get Privy App ID from environment
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

if (!PRIVY_APP_ID && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_PRIVY_APP_ID is not set. Wallet connection will not work.");
}

const { alchemyApiKey } = scaffoldConfig;

// Use Sepolia as the primary chain (Privy doesn't work well with local hardhat)
const activeChain = sepolia;

// Build RPC URL
const rpcUrl = alchemyApiKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`
  : "https://ethereum-sepolia-rpc.publicnode.com";

// Create Wagmi config using Privy's createConfig (for when Privy is configured)
export const wagmiConfig = createConfig({
  chains: [activeChain] as const,
  transports: {
    [activeChain.id]: http(rpcUrl),
  } as Record<typeof activeChain.id, ReturnType<typeof http>>,
});

// Create standard Wagmi config (for fallback when Privy is not configured)
const standardWagmiConfig = createWagmiConfig({
  chains: [activeChain],
  transports: {
    [activeChain.id]: http(rpcUrl),
  },
});

export function Providers({ children }: Props) {
  if (!PRIVY_APP_ID) {
    // Fallback for when Privy is not configured - use standard wagmi provider
    return (
      <StandardWagmiProvider config={standardWagmiConfig}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </StandardWagmiProvider>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
        loginMethods: ["wallet", "email"],
        supportedChains: [activeChain],
        defaultChain: activeChain,
        appearance: {
          showWalletLoginFirst: true,
          walletChainType: "ethereum-only",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={wagmiConfig}>{children}</PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
