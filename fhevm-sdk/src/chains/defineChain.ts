import type { FhevmChain, FhevmMockChain, FhevmProductionChain } from "./types";

/**
 * Helper to define a custom FHE chain configuration.
 * Similar to wagmi's defineChain but for FHE-enabled networks.
 *
 * @example
 * ```ts
 * const myChain = defineChain({
 *   id: 12345,
 *   name: 'My Chain',
 *   network: 'mychain',
 *   isMock: false,
 *   aclAddress: '0x...',
 *   gatewayUrl: 'https://gateway.mychain.com',
 *   // ...
 * })
 * ```
 */
export function defineChain<T extends FhevmChain>(chain: T): T {
  return chain;
}

/**
 * Helper to define a mock chain (local development).
 * Mock chains auto-fetch contract addresses from the hardhat node.
 */
export function defineMockChain(
  chain: Omit<FhevmMockChain, "isMock">
): FhevmMockChain {
  return {
    ...chain,
    isMock: true,
  };
}

/**
 * Helper to define a production chain with full FHE infrastructure.
 */
export function defineProductionChain(
  chain: Omit<FhevmProductionChain, "isMock">
): FhevmProductionChain {
  return {
    ...chain,
    isMock: false,
  };
}
