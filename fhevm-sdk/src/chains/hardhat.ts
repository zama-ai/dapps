import { defineMockChain } from "./defineChain";
import type { FhevmMockChain } from "./types";

/**
 * Hardhat local development chain.
 * Uses the FHEVM hardhat plugin in mock mode.
 *
 * Contract addresses are automatically fetched from the node
 * via the `fhevm_relayer_metadata` RPC call.
 */
export const hardhatLocal: FhevmMockChain = defineMockChain({
  id: 31337,
  name: "Hardhat Local",
  network: "hardhat",
  rpcUrl: "http://localhost:8545",
});

/**
 * Create a custom hardhat chain with a different RPC URL.
 * Useful for remote hardhat nodes or custom ports.
 *
 * @example
 * ```ts
 * const customHardhat = createHardhatChain({
 *   rpcUrl: 'http://192.168.1.100:8545'
 * })
 * ```
 */
export function createHardhatChain(options: {
  rpcUrl: string;
  id?: number;
  name?: string;
}): FhevmMockChain {
  return defineMockChain({
    id: options.id ?? 31337,
    name: options.name ?? "Hardhat Local",
    network: "hardhat",
    rpcUrl: options.rpcUrl,
  });
}
