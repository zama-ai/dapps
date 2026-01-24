import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { FhevmConfig } from "../config";
import type { FhevmInstance } from "../fhevmTypes";
import { FhevmContext, type FhevmContextValue, type FhevmStatus } from "./context";
import { createFhevmInstance, FhevmAbortError } from "../internal/fhevm";
import { InMemoryStorageProvider } from "./useInMemoryStorage";
import { fhevmQueryClient } from "./queryClient";
import { useRelayerScript } from "../internal/useRelayerScript";

/**
 * Props for FhevmProvider component.
 */
export interface FhevmProviderProps {
  /** FHEVM configuration created with createFhevmConfig */
  config: FhevmConfig;

  /** React children */
  children: React.ReactNode;

  /**
   * Wagmi connection state. Pass these from wagmi's useAccount hook.
   * If not provided, you must manage initialization manually.
   */
  wagmi?: {
    /** Whether wallet is connected */
    isConnected: boolean;
    /** Current chain ID */
    chainId: number | undefined;
    /** User's wallet address */
    address: `0x${string}` | undefined;
  };

  /**
   * EIP-1193 provider for FHEVM operations.
   * If not provided, will attempt to use window.ethereum.
   */
  provider?: any;

  /**
   * Whether to automatically initialize when wagmi connects.
   * Default: true
   */
  autoInit?: boolean;
}

/**
 * FhevmProvider initializes and manages the FHEVM instance.
 *
 * Wrap your app with this provider after WagmiProvider:
 *
 * @example
 * ```tsx
 * import { createFhevmConfig, FhevmProvider, sepolia, hardhatLocal } from 'fhevm-sdk'
 * import { useAccount } from 'wagmi'
 *
 * const config = createFhevmConfig({
 *   chains: [sepolia, hardhatLocal],
 * })
 *
 * function App() {
 *   const { isConnected, chainId, address } = useAccount()
 *
 *   return (
 *     <FhevmProvider
 *       config={config}
 *       wagmi={{ isConnected, chainId, address }}
 *     >
 *       <YourApp />
 *     </FhevmProvider>
 *   )
 * }
 * ```
 */
export function FhevmProvider({
  config,
  children,
  wagmi,
  provider: providerProp,
  autoInit = true,
}: FhevmProviderProps): React.ReactElement {
  // Load relayer SDK script automatically
  const {
    status: scriptStatus,
    error: scriptError,
    isReady: scriptReady,
  } = useRelayerScript();

  const [instance, setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [fhevmStatus, setFhevmStatus] = useState<FhevmStatus>("idle");
  const [fhevmError, setFhevmError] = useState<Error | undefined>(undefined);

  // Track initialization to prevent duplicate inits
  const initRef = useRef<{
    chainId: number | undefined;
    abortController: AbortController | null;
  }>({
    chainId: undefined,
    abortController: null,
  });

  // Combine script and fhevm status
  const status: FhevmStatus = useMemo(() => {
    if (scriptStatus === "loading") return "initializing";
    if (scriptStatus === "error") return "error";
    return fhevmStatus;
  }, [scriptStatus, fhevmStatus]);

  // Combine script and fhevm errors
  const error = scriptError ?? fhevmError;

  // Determine connection state
  const isConnected = wagmi?.isConnected ?? false;
  const chainId = wagmi?.chainId;
  const address = wagmi?.address;

  // Get provider - prefer prop, fallback to window.ethereum
  const provider = useMemo(() => {
    if (providerProp) return providerProp;
    if (typeof window !== "undefined") {
      return (window as any).ethereum;
    }
    return undefined;
  }, [providerProp]);

  // Build mock chains map from config
  const mockChains = useMemo(() => {
    const map: Record<number, string> = {};
    for (const chain of config.chains) {
      if (chain.isMock && chain.rpcUrl) {
        map[chain.id] = chain.rpcUrl;
      }
    }
    return map;
  }, [config.chains]);

  // Initialize FHEVM instance
  const initializeFhevm = useCallback(
    async (targetChainId: number) => {
      // Abort any existing initialization
      if (initRef.current.abortController) {
        initRef.current.abortController.abort();
      }

      // Check if chain is supported
      const chain = config.getChain(targetChainId);
      if (!chain) {
        console.warn(
          `[FhevmProvider] Chain ${targetChainId} is not configured. Skipping initialization.`
        );
        setFhevmStatus("idle");
        return;
      }

      // Check if provider is available
      if (!provider) {
        console.warn(
          "[FhevmProvider] No provider available. Skipping initialization."
        );
        setFhevmStatus("idle");
        return;
      }

      const abortController = new AbortController();
      initRef.current = {
        chainId: targetChainId,
        abortController,
      };

      setFhevmStatus("initializing");
      setFhevmError(undefined);
      setInstance(undefined);

      try {
        const newInstance = await createFhevmInstance({
          provider,
          mockChains,
          signal: abortController.signal,
          onStatusChange: (sdkStatus) => {
            console.log(`[FhevmProvider] SDK status: ${sdkStatus}`);
          },
        });

        // Check if we were aborted during initialization
        if (abortController.signal.aborted) {
          return;
        }

        // Check if chain changed during initialization
        if (initRef.current.chainId !== targetChainId) {
          console.log(
            `[FhevmProvider] Chain changed during initialization. Discarding instance.`
          );
          return;
        }

        setInstance(newInstance);
        setFhevmStatus("ready");
        console.log(
          `[FhevmProvider] FHEVM instance ready for chain ${targetChainId}`
        );
      } catch (err) {
        if (err instanceof FhevmAbortError) {
          // Initialization was cancelled, ignore
          return;
        }

        console.error("[FhevmProvider] Failed to initialize FHEVM:", err);
        setFhevmError(err instanceof Error ? err : new Error(String(err)));
        setFhevmStatus("error");
      }
    },
    [provider, config, mockChains]
  );

  // Refresh function for manual re-initialization
  const refresh = useCallback(() => {
    if (chainId !== undefined) {
      initializeFhevm(chainId);
    }
  }, [chainId, initializeFhevm]);

  // Auto-initialize when wagmi connects or chain changes
  useEffect(() => {
    if (!autoInit) return;

    // Don't initialize in SSR
    if (config.ssr && typeof window === "undefined") return;

    // Don't initialize until script is ready
    if (!scriptReady) return;

    // Don't initialize if not connected
    if (!isConnected || chainId === undefined) {
      // Clean up existing instance if disconnected
      if (initRef.current.abortController) {
        initRef.current.abortController.abort();
        initRef.current.abortController = null;
      }
      setInstance(undefined);
      setFhevmStatus("idle");
      setFhevmError(undefined);
      return;
    }

    // Don't re-initialize for the same chain
    if (initRef.current.chainId === chainId && fhevmStatus === "ready") {
      return;
    }

    // Small delay to ensure provider is stable
    const timeoutId = setTimeout(() => {
      initializeFhevm(chainId);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [autoInit, isConnected, chainId, config.ssr, initializeFhevm, fhevmStatus, scriptReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (initRef.current.abortController) {
        initRef.current.abortController.abort();
      }
    };
  }, []);

  // Build context value
  const contextValue = useMemo<FhevmContextValue>(
    () => ({
      config,
      instance,
      status,
      error,
      chainId,
      address,
      isConnected,
      refresh,
    }),
    [config, instance, status, error, chainId, address, isConnected, refresh]
  );

  return (
    <FhevmContext.Provider value={contextValue}>
      <QueryClientProvider client={fhevmQueryClient}>
        <InMemoryStorageProvider>
          {children}
        </InMemoryStorageProvider>
      </QueryClientProvider>
    </FhevmContext.Provider>
  );
}
