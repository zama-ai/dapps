import { createContext, useContext } from "react";
import type { FhevmConfig } from "../config";
import type { FhevmInstance } from "../fhevmTypes";
import type { Eip1193Provider } from "../internal/eip1193";
import type { GenericStringStorage } from "../storage/GenericStringStorage";

/**
 * Status of the FHEVM instance initialization.
 */
export type FhevmStatus = "idle" | "initializing" | "ready" | "error";

/**
 * Context value provided by FhevmProvider.
 */
export interface FhevmContextValue {
  /** The FHEVM configuration */
  config: FhevmConfig;

  /** The initialized FHEVM instance, undefined until ready */
  instance: FhevmInstance | undefined;

  /** Current initialization status */
  status: FhevmStatus;

  /** Error if status is 'error' */
  error: Error | undefined;

  /** Current chain ID */
  chainId: number | undefined;

  /** User's wallet address */
  address: `0x${string}` | undefined;

  /** Whether the wallet is connected */
  isConnected: boolean;

  /** EIP-1193 provider for signing operations */
  provider: Eip1193Provider | undefined;

  /** Storage for caching signatures (optional, developer-provided) */
  storage: GenericStringStorage | undefined;

  /** Force re-initialization of the FHEVM instance */
  refresh: () => void;
}

/**
 * React context for FHEVM state.
 * @internal
 */
export const FhevmContext = createContext<FhevmContextValue | null>(null);

/**
 * Hook to access the FHEVM context.
 * Must be used within a FhevmProvider.
 *
 * @internal - Use the specific hooks (useEncrypt, useUserDecrypt, etc.) instead
 */
export function useFhevmContext(): FhevmContextValue {
  const context = useContext(FhevmContext);
  if (!context) {
    throw new Error(
      "useFhevmContext must be used within a FhevmProvider. " +
        "Make sure to wrap your app with <FhevmProvider config={config}>."
    );
  }
  return context;
}
