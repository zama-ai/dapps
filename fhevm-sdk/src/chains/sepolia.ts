import { defineProductionChain } from "./defineChain";
import type { FhevmProductionChain } from "./types";

/**
 * Ethereum Sepolia testnet with Zama FHE infrastructure.
 *
 * This chain uses the Zama relayer SDK for encrypted operations.
 * Contract addresses are loaded from the SDK at runtime via SepoliaConfig.
 *
 * Note: The actual addresses are fetched from the relayer SDK at runtime
 * to ensure they stay in sync with Zama's infrastructure updates.
 * The placeholder addresses below are overridden during initialization.
 */
export const sepolia: FhevmProductionChain = defineProductionChain({
  id: 11155111,
  name: "Sepolia",
  network: "sepolia",
  // These are placeholder values - actual addresses come from relayer SDK's SepoliaConfig
  // at runtime to stay in sync with Zama's infrastructure
  aclAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  gatewayUrl: "https://gateway.sepolia.zama.ai",
  kmsVerifierAddress:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
  inputVerifierAddress:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
  relayerUrl: "https://relayer.sepolia.zama.ai",
});

/**
 * Marker to indicate this chain should use SepoliaConfig from relayer SDK.
 * Used internally to differentiate from custom production chains.
 */
export const SEPOLIA_CHAIN_ID = 11155111;
