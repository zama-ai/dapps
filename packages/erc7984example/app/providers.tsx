"use client";

import { type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http } from "viem";
import { sepolia } from "viem/chains";
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

// Create Wagmi config using Privy's createConfig
export const wagmiConfig = createConfig({
  chains: [activeChain] as const,
  transports: {
    [activeChain.id]: http(rpcUrl),
  } as Record<typeof activeChain.id, ReturnType<typeof http>>,
});

export function Providers({ children }: Props) {
  if (!PRIVY_APP_ID) {
    // Fallback for when Privy is not configured
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
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
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
