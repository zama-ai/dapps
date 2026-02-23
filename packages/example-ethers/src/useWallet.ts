import { useState, useCallback, useEffect } from "react";
import { BrowserProvider, JsonRpcSigner, getAddress } from "ethers";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

interface WalletState {
  address: `0x${string}` | undefined;
  chainId: number | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | undefined;
  signer: JsonRpcSigner | undefined;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: undefined,
    chainId: undefined,
    isConnected: false,
    isConnecting: false,
    error: undefined,
    signer: undefined,
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
      const provider = new BrowserProvider(window.ethereum);
      const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();

      // Use getAddress to get checksummed address
      const checksummedAddress = getAddress(accounts[0]) as `0x${string}`;

      setState({
        address: checksummedAddress,
        chainId: Number(network.chainId),
        isConnected: true,
        isConnecting: false,
        error: undefined,
        signer,
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
      signer: undefined,
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
        const checksummedAddress = getAddress(accs[0]) as `0x${string}`;
        setState((s) => ({ ...s, address: checksummedAddress }));
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
