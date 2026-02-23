/**
 * Token registry for Sepolia testnet ERC20/ERC7984 wrapper pairs.
 */

export interface WrapperToken {
  /** ERC7984 wrapper contract address */
  wrapper: `0x${string}`;
  /** Underlying ERC20 token address */
  underlying: `0x${string}`;
  /** Confidential token symbol (e.g., "cTEST1") */
  symbol: string;
  /** Underlying token symbol (e.g., "TEST1") */
  underlyingSymbol: string;
  /** Token decimals */
  decimals: number;
}

export const WRAPPER_TOKENS: Record<string, WrapperToken> = {
  cTEST1: {
    wrapper: "0x593E77e7E2bEe748aa27942E1f2069b5B6902625",
    underlying: "0x0D03CF79A2798b35C27b2b52B23674742D278F90",
    symbol: "cTEST1",
    underlyingSymbol: "TEST1",
    decimals: 18,
  },
  cTEST2: {
    wrapper: "0x9942aBbEAb7f5BcefbA3d9865B148aA79B2E82eB",
    underlying: "0xD616Bc7D4dbC05450dA7F7d3678e4047300bdc40",
    symbol: "cTEST2",
    underlyingSymbol: "TEST2",
    decimals: 18,
  },
} as const;

export const WRAPPER_TOKEN_LIST = Object.values(WRAPPER_TOKENS);

/**
 * Format a bigint amount with decimals for display.
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals: number = 4
): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;

  if (remainder === BigInt(0)) {
    return whole.toString();
  }

  // Convert remainder to decimal string with leading zeros
  const remainderStr = remainder.toString().padStart(decimals, "0");
  // Trim trailing zeros and limit to maxDecimals
  const trimmed = remainderStr.slice(0, maxDecimals).replace(/0+$/, "");

  if (trimmed === "") {
    return whole.toString();
  }

  return `${whole}.${trimmed}`;
}

/**
 * Parse a decimal string to bigint with decimals.
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + paddedFraction);
}
