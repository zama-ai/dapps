/**
 * EIP-1193 utilities for provider-only SDK design.
 * No ethers.js dependency - uses raw EIP-1193 provider methods.
 */

/**
 * Standard EIP-1193 provider interface.
 * This is what window.ethereum, wagmi connectors, and viem clients all implement.
 */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/**
 * EIP-712 typed data domain.
 */
export interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: `0x${string}`;
  salt?: `0x${string}`;
}

/**
 * EIP-712 type definition.
 */
export interface TypedDataField {
  name: string;
  type: string;
}

/**
 * EIP-712 typed data structure.
 */
export interface EIP712TypedData {
  domain: TypedDataDomain;
  types: Record<string, TypedDataField[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

/**
 * Validate an Ethereum address.
 * Replaces ethers.isAddress.
 */
export function isAddress(value: unknown): value is `0x${string}` {
  if (typeof value !== "string") return false;
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Normalize an address to checksummed format.
 * Simple implementation without full checksum validation.
 */
export function normalizeAddress(address: string): `0x${string}` {
  if (!isAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return address.toLowerCase() as `0x${string}`;
}

/**
 * Sign EIP-712 typed data using an EIP-1193 provider.
 * Uses eth_signTypedData_v4 method directly.
 */
export async function signTypedData(
  provider: Eip1193Provider,
  address: `0x${string}`,
  typedData: EIP712TypedData
): Promise<string> {
  // eth_signTypedData_v4 expects the full typed data as a JSON string
  const dataToSign = {
    domain: typedData.domain,
    types: {
      EIP712Domain: getEIP712DomainType(typedData.domain),
      ...typedData.types,
    },
    primaryType: typedData.primaryType,
    message: typedData.message,
  };

  // Custom replacer to handle BigInt serialization
  const replacer = (_key: string, value: unknown): unknown => {
    if (typeof value === "bigint") {
      return Number(value);
    }
    return value;
  };

  const signature = await provider.request({
    method: "eth_signTypedData_v4",
    params: [address, JSON.stringify(dataToSign, replacer)],
  });

  return signature as string;
}

/**
 * Get the EIP712Domain type array based on which domain fields are present.
 */
function getEIP712DomainType(domain: TypedDataDomain): TypedDataField[] {
  const types: TypedDataField[] = [];

  if (domain.name !== undefined) {
    types.push({ name: "name", type: "string" });
  }
  if (domain.version !== undefined) {
    types.push({ name: "version", type: "string" });
  }
  if (domain.chainId !== undefined) {
    types.push({ name: "chainId", type: "uint256" });
  }
  if (domain.verifyingContract !== undefined) {
    types.push({ name: "verifyingContract", type: "address" });
  }
  if (domain.salt !== undefined) {
    types.push({ name: "salt", type: "bytes32" });
  }

  return types;
}

/**
 * Get the current chain ID from an EIP-1193 provider.
 */
export async function getChainId(provider: Eip1193Provider): Promise<number> {
  const chainId = await provider.request({ method: "eth_chainId" });
  return Number.parseInt(chainId as string, 16);
}

/**
 * Get connected accounts from an EIP-1193 provider.
 */
export async function getAccounts(
  provider: Eip1193Provider
): Promise<`0x${string}`[]> {
  const accounts = await provider.request({ method: "eth_accounts" });
  return accounts as `0x${string}`[];
}

/**
 * Request account access from an EIP-1193 provider.
 */
export async function requestAccounts(
  provider: Eip1193Provider
): Promise<`0x${string}`[]> {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  return accounts as `0x${string}`[];
}

/**
 * Hash EIP-712 typed data for use as a cache key.
 * This is a simplified hash - not cryptographically secure, just for cache keys.
 */
export function hashTypedDataForKey(typedData: EIP712TypedData): string {
  const str = JSON.stringify({
    domain: typedData.domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    // Only include relevant message fields for the key, not timestamps
    message: {
      publicKey: typedData.message.publicKey,
      contractAddresses: typedData.message.contractAddresses,
    },
  });

  // Simple hash function for cache keys
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}
