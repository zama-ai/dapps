import { useFhevmContext, type FhevmStatus } from "./context";

/**
 * Return type for useFhevmStatus hook.
 */
export interface UseFhevmStatusReturn {
  /** Current initialization status */
  status: FhevmStatus;

  /** Error if status is 'error' */
  error: Error | undefined;

  /** Convenience flag: true when status is 'ready' */
  isReady: boolean;

  /** Convenience flag: true when status is 'initializing' */
  isInitializing: boolean;

  /** Convenience flag: true when status is 'error' */
  isError: boolean;

  /** Current chain ID */
  chainId: number | undefined;

  /** Whether wallet is connected */
  isConnected: boolean;
}

/**
 * Hook to get the current FHEVM status.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isReady, isInitializing, error } = useFhevmStatus()
 *
 *   if (isInitializing) return <div>Initializing FHE...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *   if (!isReady) return <div>Connect your wallet</div>
 *
 *   return <div>FHE Ready!</div>
 * }
 * ```
 */
export function useFhevmStatus(): UseFhevmStatusReturn {
  const { status, error, chainId, isConnected } = useFhevmContext();

  return {
    status,
    error,
    isReady: status === "ready",
    isInitializing: status === "initializing",
    isError: status === "error",
    chainId,
    isConnected,
  };
}
