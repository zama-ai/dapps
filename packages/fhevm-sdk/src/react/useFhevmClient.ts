import { useFhevmContext, type FhevmStatus } from "./context";
import type { FhevmInstance } from "../fhevmTypes";
import type { FhevmConfig } from "../config";

/**
 * Return type for useFhevmClient hook.
 */
export interface UseFhevmClientReturn {
  /** The FHEVM instance, undefined until ready */
  instance: FhevmInstance | undefined;

  /** Current initialization status */
  status: FhevmStatus;

  /** The FHEVM configuration */
  config: FhevmConfig;

  /** Force re-initialization */
  refresh: () => void;

  /** Whether the instance is ready to use */
  isReady: boolean;
}

/**
 * Hook to get direct access to the FHEVM instance.
 *
 * Use this for advanced operations or when building custom hooks.
 * For most use cases, prefer useEncrypt and useUserDecrypt hooks.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { instance, isReady, refresh } = useFhevmClient()
 *
 *   if (!isReady) return <div>Not ready</div>
 *
 *   // Use instance directly for advanced operations
 *   const publicKey = instance.getPublicKey()
 *
 *   return (
 *     <div>
 *       <button onClick={refresh}>Refresh Instance</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFhevmClient(): UseFhevmClientReturn {
  const { instance, status, config, refresh } = useFhevmContext();

  return {
    instance,
    status,
    config,
    refresh,
    isReady: status === "ready" && instance !== undefined,
  };
}
