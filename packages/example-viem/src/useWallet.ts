import { useState, useCallback, useEffect } from "react";
import { createWalletClient, custom, type WalletClient, type CustomTransport, type Chain } from "viem";
import { mainnet } from "viem/chains";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

type Client = WalletClient<CustomTransport, Chain>;

interface WalletState {
  address: `0x${string}` | undefined;
  chainId: number | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | undefined;
  client: Client | undefined;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: undefined,
    chainId: undefined,
    isConnected: false,
    isConnecting: false,
    error: undefined,
    client: undefined,
  });

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setState((s) => ({
        ...s,
        error: new Error("No wallet found. Please install MetaMask."),
      }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: undefined }));

    try {
      const client = createWalletClient({
        chain: mainnet,
        transport: custom(window.ethereum),
      });

      const [address] = await client.requestAddresses();
      const chainId = await client.getChainId();

      setState({
        address,
        chainId,
        isConnected: true,
        isConnecting: false,
        error: undefined,
        client,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err instanceof Error ? err : new Error("Failed to connect"),
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: undefined,
      chainId: undefined,
      isConnected: false,
      isConnecting: false,
      error: undefined,
      client: undefined,
    });
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        disconnect();
      } else if (state.isConnected) {
        setState((s) => ({ ...s, address: accs[0] as `0x${string}` }));
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      setState((s) => ({ ...s, chainId: Number(chainId) }));
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [state.isConnected, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}
