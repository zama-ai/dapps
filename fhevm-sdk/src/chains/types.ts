/**
 * FhevmChain defines the configuration for an FHE-enabled blockchain network.
 * Similar to wagmi's Chain type but specific to FHE operations.
 */
export type FhevmChain = {
  /** Unique chain identifier */
  id: number;
  /** Human-readable chain name */
  name: string;
  /** Network identifier (e.g., 'sepolia', 'hardhat') */
  network: string;
  /** Whether this is a mock/local chain (uses hardhat plugin mock mode) */
  isMock: boolean;
  /** RPC URL for the chain (required for mock chains) */
  rpcUrl?: string;
  /** ACL contract address - controls FHE access permissions */
  aclAddress?: `0x${string}`;
  /** Gateway URL for relayer operations (production chains) */
  gatewayUrl?: string;
  /** KMS verifier contract address */
  kmsVerifierAddress?: `0x${string}`;
  /** Input verifier contract address */
  inputVerifierAddress?: `0x${string}`;
  /** Relayer URL for encrypted transaction relay */
  relayerUrl?: string;
};

/**
 * Configuration for mock chains that auto-fetch metadata from the node
 */
export type FhevmMockChain = FhevmChain & {
  isMock: true;
  rpcUrl: string;
};

/**
 * Configuration for production chains with full FHE infrastructure
 */
export type FhevmProductionChain = FhevmChain & {
  isMock: false;
  aclAddress: `0x${string}`;
  gatewayUrl: string;
  kmsVerifierAddress: `0x${string}`;
  inputVerifierAddress: `0x${string}`;
  relayerUrl: string;
};

/**
 * Type guard to check if a chain is a mock chain
 */
export function isMockChain(chain: FhevmChain): chain is FhevmMockChain {
  return chain.isMock === true && typeof chain.rpcUrl === "string";
}

/**
 * Type guard to check if a chain is a production chain
 */
export function isProductionChain(
  chain: FhevmChain
): chain is FhevmProductionChain {
  return (
    chain.isMock === false &&
    typeof chain.aclAddress === "string" &&
    typeof chain.gatewayUrl === "string"
  );
}
