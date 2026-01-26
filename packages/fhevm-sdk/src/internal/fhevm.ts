import type {
  FhevmInitSDKOptions,
  FhevmInitSDKType,
  FhevmLoadSDKType,
  FhevmWindowType,
} from "./fhevmTypes";
import { isFhevmWindowType, RelayerSDKLoader } from "./RelayerSDKLoader";
import { publicKeyStorageGet, publicKeyStorageSet } from "./PublicKeyStorage";
import { FhevmInstance, FhevmInstanceConfig } from "../fhevmTypes";
import {
  isAddress,
  getChainId as getChainIdFromProvider,
  type Eip1193Provider,
} from "./eip1193";
import {
  getChainIdFromUrl,
  getWeb3ClientVersion,
  tryGetFhevmHardhatMetadata,
  rpcCall,
} from "./rpc";

export class FhevmReactError extends Error {
  code: string;
  constructor(code: string, message?: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "FhevmReactError";
  }
}

function throwFhevmError(
  code: string,
  message?: string,
  cause?: unknown
): never {
  throw new FhevmReactError(code, message, cause ? { cause } : undefined);
}

const isFhevmInitialized = (): boolean => {
  if (!isFhevmWindowType(window, console.log)) {
    return false;
  }
  return window.relayerSDK.__initialized__ === true;
};

const fhevmLoadSDK: FhevmLoadSDKType = () => {
  const loader = new RelayerSDKLoader({ trace: console.log });
  return loader.load();
};

const fhevmInitSDK: FhevmInitSDKType = async (
  options?: FhevmInitSDKOptions
) => {
  if (!isFhevmWindowType(window, console.log)) {
    throw new Error("window.relayerSDK is not available");
  }
  const result = await window.relayerSDK.initSDK(options);
  window.relayerSDK.__initialized__ = result;
  if (!result) {
    throw new Error("window.relayerSDK.initSDK failed.");
  }
  return true;
};

function checkIsAddress(a: unknown): a is `0x${string}` {
  if (typeof a !== "string") {
    return false;
  }
  return isAddress(a);
}

export class FhevmAbortError extends Error {
  constructor(message = "FHEVM operation was cancelled") {
    super(message);
    this.name = "FhevmAbortError";
  }
}

type FhevmRelayerStatusType =
  | "sdk-loading"
  | "sdk-loaded"
  | "sdk-initializing"
  | "sdk-initialized"
  | "creating";

async function getChainId(
  providerOrUrl: Eip1193Provider | string
): Promise<number> {
  if (typeof providerOrUrl === "string") {
    return getChainIdFromUrl(providerOrUrl);
  }
  return getChainIdFromProvider(providerOrUrl);
}

async function getWeb3Client(rpcUrl: string) {
  try {
    const version = await getWeb3ClientVersion(rpcUrl);
    return version;
  } catch (e) {
    throwFhevmError(
      "WEB3_CLIENTVERSION_ERROR",
      `The URL ${rpcUrl} is not a Web3 node or is not reachable. Please check the endpoint.`,
      e
    );
  }
}

async function tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl: string): Promise<
  | {
      ACLAddress: `0x${string}`;
      InputVerifierAddress: `0x${string}`;
      KMSVerifierAddress: `0x${string}`;
    }
  | undefined
> {
  const version = await getWeb3Client(rpcUrl);
  if (
    typeof version !== "string" ||
    !version.toLowerCase().includes("hardhat")
  ) {
    // Not a Hardhat Node
    return undefined;
  }
  try {
    return await tryGetFhevmHardhatMetadata(rpcUrl);
  } catch {
    // Not a FHEVM Hardhat Node
    return undefined;
  }
}

type MockResolveResult = { isMock: true; chainId: number; rpcUrl: string };
type GenericResolveResult = { isMock: false; chainId: number; rpcUrl?: string };
type ResolveResult = MockResolveResult | GenericResolveResult;

async function resolve(
  providerOrUrl: Eip1193Provider | string,
  mockChains?: Record<number, string>
): Promise<ResolveResult> {
  // Resolve chainId
  const chainId = await getChainId(providerOrUrl);

  // Resolve rpc url
  let rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;

  const _mockChains: Record<number, string> = {
    31337: "http://localhost:8545",
    ...(mockChains ?? {}),
  };

  // Help Typescript solver here:
  if (Object.hasOwn(_mockChains, chainId)) {
    if (!rpcUrl) {
      rpcUrl = _mockChains[chainId];
    }

    return { isMock: true, chainId, rpcUrl };
  }

  return { isMock: false, chainId, rpcUrl };
}

export const createFhevmInstance = async (parameters: {
  provider: Eip1193Provider | string;
  mockChains?: Record<number, string>;
  signal: AbortSignal;
  onStatusChange?: (status: FhevmRelayerStatusType) => void;
}): Promise<FhevmInstance> => {
  const throwIfAborted = () => {
    if (signal.aborted) throw new FhevmAbortError();
  };

  const notify = (status: FhevmRelayerStatusType) => {
    if (onStatusChange) onStatusChange(status);
  };

  const {
    signal,
    onStatusChange,
    provider: providerOrUrl,
    mockChains,
  } = parameters;

  // Resolve chainId
  const { isMock, rpcUrl, chainId } = await resolve(providerOrUrl, mockChains);

  if (isMock) {
    // Throws an error if cannot connect or url does not refer to a Web3 client
    const fhevmRelayerMetadata =
      await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);

    if (fhevmRelayerMetadata) {
      // fhevmRelayerMetadata is defined, which means rpcUrl refers to a FHEVM Hardhat Node
      notify("creating");

      //////////////////////////////////////////////////////////////////////////
      //
      // WARNING!!
      // ALWAY USE DYNAMIC IMPORT TO AVOID INCLUDING THE ENTIRE FHEVM MOCK LIB
      // IN THE FINAL PRODUCTION BUNDLE!!
      //
      //////////////////////////////////////////////////////////////////////////
      const fhevmMock = await import("./mock/fhevmMock");
      const mockInstance = await fhevmMock.fhevmMockCreateInstance({
        rpcUrl,
        chainId,
        metadata: fhevmRelayerMetadata,
      });

      throwIfAborted();

      return mockInstance;
    }
  }

  throwIfAborted();

  if (!isFhevmWindowType(window, console.log)) {
    notify("sdk-loading");

    // throws an error if failed
    await fhevmLoadSDK();
    throwIfAborted();

    notify("sdk-loaded");
  }

  // notify that state === "sdk-loaded"

  if (!isFhevmInitialized()) {
    notify("sdk-initializing");

    // throws an error if failed
    await fhevmInitSDK();
    throwIfAborted();

    notify("sdk-initialized");
  }

  const relayerSDK = (window as unknown as FhevmWindowType).relayerSDK;

  const aclAddress = relayerSDK.SepoliaConfig.aclContractAddress;
  if (!checkIsAddress(aclAddress)) {
    throw new Error(`Invalid address: ${aclAddress}`);
  }

  const pub = await publicKeyStorageGet(aclAddress);
  throwIfAborted();

  const config: FhevmInstanceConfig = {
    ...relayerSDK.SepoliaConfig,
    relayerUrl: `${relayerSDK.SepoliaConfig.relayerUrl}/v2`,
    network: providerOrUrl,
    publicKey: pub.publicKey,
    publicParams: pub.publicParams,
    relayerRouteVersion: 2
  };

  // notify that state === "creating"
  notify("creating");

  const instance = await relayerSDK.createInstance(config);

  // Save the key even if aborted
  await publicKeyStorageSet(
    aclAddress,
    instance.getPublicKey(),
    instance.getPublicParams(2048)
  );

  throwIfAborted();

  return instance;
};
