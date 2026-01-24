/**
 * Relayer SDK version locked in the fhevm-sdk.
 * Users don't need to manage this - it's handled internally.
 */
export const RELAYER_SDK_VERSION = "0.4.0-4";

/**
 * CDN URL for the relayer SDK script.
 */
export const RELAYER_SDK_URL = `https://cdn.zama.org/relayer-sdk-js/${RELAYER_SDK_VERSION}/relayer-sdk-js.umd.cjs`;

/** @deprecated Use RELAYER_SDK_URL instead */
export const SDK_CDN_URL = RELAYER_SDK_URL;
