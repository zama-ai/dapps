"use client";

import { type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { sepolia, hardhat } from "viem/chains";
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

// Build RPC URLs
const sepoliaRpcUrl = alchemyApiKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`
  : "https://ethereum-sepolia-rpc.publicnode.com";

// Include both chains — hardhat transport is harmless in production
const chains = [sepolia, hardhat] as const;
const transports = {
  [sepolia.id]: http(sepoliaRpcUrl),
  [hardhat.id]: http("http://127.0.0.1:8545"),
};

// Create Wagmi config using Privy's createConfig (for when Privy is configured)
export const wagmiConfig = createConfig({
  chains,
  transports,
});

// Create standard Wagmi config (for fallback when Privy is not configured)
const standardWagmiConfig = createWagmiConfig({
  chains,
  transports,
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
        supportedChains: [...chains],
        defaultChain: sepolia,
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
