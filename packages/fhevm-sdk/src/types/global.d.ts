/**
 * Global type declarations for fhevm-sdk.
 */

declare global {
  interface Window {
    /**
     * The relayer SDK loaded from CDN.
     * This is automatically loaded by FhevmProvider.
     */
    relayerSDK?: typeof import("@zama-fhe/relayer-sdk/web");
  }
}

export {};
