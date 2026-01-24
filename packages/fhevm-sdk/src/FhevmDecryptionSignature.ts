import { GenericStringStorage } from "./storage/GenericStringStorage";
import { EIP712Type, FhevmDecryptionSignatureType, FhevmInstance } from "./fhevmTypes";
import {
  isAddress,
  signTypedData,
  hashTypedDataForKey,
  type Eip1193Provider,
  type EIP712TypedData,
} from "./internal/eip1193";

function _timestampNow(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Parameters for signing a decryption request.
 */
export interface SignerParams {
  /** EIP-1193 provider (window.ethereum, wagmi connector, etc.) */
  provider: Eip1193Provider;
  /** User's wallet address */
  address: `0x${string}`;
}

class FhevmDecryptionSignatureStorageKey {
  #contractAddresses: `0x${string}`[];
  #userAddress: `0x${string}`;
  #publicKey: string | undefined;
  #key: string;

  constructor(
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ) {
    if (!isAddress(userAddress)) {
      throw new TypeError(`Invalid address ${userAddress}`);
    }

    const sortedContractAddresses = (contractAddresses as `0x${string}`[]).sort();

    // Create a minimal EIP712 structure for hashing (using zero address and 0 timestamps)
    const emptyEIP712 = (instance as any).createEIP712(
      publicKey ?? "0x0000000000000000000000000000000000000000",
      sortedContractAddresses,
      0,
      0
    );

    // Create a simple hash for the storage key
    const typedData: EIP712TypedData = {
      domain: emptyEIP712.domain,
      types: { UserDecryptRequestVerification: emptyEIP712.types.UserDecryptRequestVerification },
      primaryType: "UserDecryptRequestVerification",
      message: emptyEIP712.message,
    };

    const hash = hashTypedDataForKey(typedData);

    this.#contractAddresses = sortedContractAddresses;
    this.#userAddress = userAddress as `0x${string}`;
    this.#publicKey = publicKey;
    this.#key = `${userAddress}:${hash}`;
  }

  get contractAddresses(): `0x${string}`[] {
    return this.#contractAddresses;
  }

  get userAddress(): `0x${string}` {
    return this.#userAddress;
  }

  get publicKey(): string | undefined {
    return this.#publicKey;
  }

  get key(): string {
    return this.#key;
  }
}

export class FhevmDecryptionSignature {
  #publicKey: string;
  #privateKey: string;
  #signature: string;
  #startTimestamp: number;
  #durationDays: number;
  #userAddress: `0x${string}`;
  #contractAddresses: `0x${string}`[];
  #eip712: EIP712Type;

  private constructor(parameters: FhevmDecryptionSignatureType) {
    if (!FhevmDecryptionSignature.checkIs(parameters)) {
      throw new TypeError("Invalid FhevmDecryptionSignatureType");
    }
    this.#publicKey = parameters.publicKey;
    this.#privateKey = parameters.privateKey;
    this.#signature = parameters.signature;
    this.#startTimestamp = parameters.startTimestamp;
    this.#durationDays = parameters.durationDays;
    this.#userAddress = parameters.userAddress;
    this.#contractAddresses = parameters.contractAddresses;
    this.#eip712 = parameters.eip712;
  }

  public get privateKey() {
    return this.#privateKey;
  }

  public get publicKey() {
    return this.#publicKey;
  }

  public get signature() {
    return this.#signature;
  }

  public get contractAddresses() {
    return this.#contractAddresses;
  }

  public get startTimestamp() {
    return this.#startTimestamp;
  }

  public get durationDays() {
    return this.#durationDays;
  }

  public get userAddress() {
    return this.#userAddress;
  }

  static checkIs(s: unknown): s is FhevmDecryptionSignatureType {
    if (!s || typeof s !== "object") {
      return false;
    }
    if (!("publicKey" in s && typeof (s as any).publicKey === "string")) {
      return false;
    }
    if (!("privateKey" in s && typeof (s as any).privateKey === "string")) {
      return false;
    }
    if (!("signature" in s && typeof (s as any).signature === "string")) {
      return false;
    }
    if (!("startTimestamp" in s && typeof (s as any).startTimestamp === "number")) {
      return false;
    }
    if (!("durationDays" in s && typeof (s as any).durationDays === "number")) {
      return false;
    }
    if (!("contractAddresses" in s && Array.isArray((s as any).contractAddresses))) {
      return false;
    }
    for (let i = 0; i < (s as any).contractAddresses.length; ++i) {
      if (typeof (s as any).contractAddresses[i] !== "string") return false;
      if (!((s as any).contractAddresses[i] as string).startsWith("0x")) return false;
    }
    if (
      !(
        "userAddress" in s &&
        typeof (s as any).userAddress === "string" &&
        (s as any).userAddress.startsWith("0x")
      )
    ) {
      return false;
    }
    if (!("eip712" in s && typeof (s as any).eip712 === "object" && (s as any).eip712 !== null)) {
      return false;
    }
    if (!("domain" in (s as any).eip712 && typeof (s as any).eip712.domain === "object")) {
      return false;
    }
    if (!("primaryType" in (s as any).eip712 && typeof (s as any).eip712.primaryType === "string")) {
      return false;
    }
    if (!("message" in (s as any).eip712)) {
      return false;
    }
    if (
      !(
        "types" in (s as any).eip712 &&
        typeof (s as any).eip712.types === "object" &&
        (s as any).eip712.types !== null
      )
    ) {
      return false;
    }
    return true;
  }

  toJSON() {
    return {
      publicKey: this.#publicKey,
      privateKey: this.#privateKey,
      signature: this.#signature,
      startTimestamp: this.#startTimestamp,
      durationDays: this.#durationDays,
      userAddress: this.#userAddress,
      contractAddresses: this.#contractAddresses,
      eip712: this.#eip712,
    };
  }

  static fromJSON(json: unknown) {
    const data = typeof json === "string" ? JSON.parse(json) : json;
    return new FhevmDecryptionSignature(data as any);
  }

  equals(s: FhevmDecryptionSignatureType) {
    return s.signature === this.#signature;
  }

  isValid(): boolean {
    return _timestampNow() < this.#startTimestamp + this.#durationDays * 24 * 60 * 60;
  }

  async saveToGenericStringStorage(
    storage: GenericStringStorage,
    instance: FhevmInstance,
    withPublicKey: boolean
  ) {
    try {
      const value = JSON.stringify(this);

      const storageKey = new FhevmDecryptionSignatureStorageKey(
        instance,
        this.#contractAddresses,
        this.#userAddress,
        withPublicKey ? this.#publicKey : undefined
      );
      await storage.setItem(storageKey.key, value);
    } catch {
      // ignore
    }
  }

  static async loadFromGenericStringStorage(
    storage: GenericStringStorage,
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      const storageKey = new FhevmDecryptionSignatureStorageKey(
        instance,
        contractAddresses,
        userAddress,
        publicKey
      );

      const result = await storage.getItem(storageKey.key);

      if (!result) {
        return null;
      }

      try {
        const kps = FhevmDecryptionSignature.fromJSON(result);
        if (!kps.isValid()) {
          return null;
        }

        return kps;
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Create a new decryption signature using EIP-1193 provider.
   */
  static async new(
    instance: FhevmInstance,
    contractAddresses: string[],
    publicKey: string,
    privateKey: string,
    signer: SignerParams
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      const userAddress = signer.address;
      const startTimestamp = _timestampNow();
      // Default to 1 day for security - developers can override
      const durationDays = 1;

      const eip712 = (instance as any).createEIP712(
        publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );

      // Convert to our EIP712TypedData format
      const typedData: EIP712TypedData = {
        domain: eip712.domain,
        types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        primaryType: "UserDecryptRequestVerification",
        message: eip712.message,
      };

      // Sign using EIP-1193 provider directly
      const signature = await signTypedData(signer.provider, userAddress, typedData);

      return new FhevmDecryptionSignature({
        publicKey,
        privateKey,
        contractAddresses: contractAddresses as `0x${string}`[],
        startTimestamp,
        durationDays,
        signature,
        eip712: eip712 as EIP712Type,
        userAddress,
      });
    } catch (err) {
      console.error("[FhevmDecryptionSignature] Failed to create signature:", err);
      return null;
    }
  }

  /**
   * Load a cached signature or create a new one.
   * Uses EIP-1193 provider for signing.
   */
  static async loadOrSign(
    instance: FhevmInstance,
    contractAddresses: string[],
    signer: SignerParams,
    storage: GenericStringStorage,
    keyPair?: { publicKey: string; privateKey: string }
  ): Promise<FhevmDecryptionSignature | null> {
    const userAddress = signer.address;

    const cached: FhevmDecryptionSignature | null =
      await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        instance,
        contractAddresses,
        userAddress,
        keyPair?.publicKey
      );

    if (cached) {
      console.log("[FhevmDecryptionSignature] Using cached signature");
      return cached;
    }

    console.log("[FhevmDecryptionSignature] Generating new keypair...");
    const { publicKey, privateKey } = keyPair ?? (instance as any).generateKeypair();

    const sig = await FhevmDecryptionSignature.new(
      instance,
      contractAddresses,
      publicKey,
      privateKey,
      signer
    );

    if (!sig) {
      console.error("[FhevmDecryptionSignature] Failed to create signature");
      return null;
    }

    await sig.saveToGenericStringStorage(storage, instance, Boolean(keyPair?.publicKey));

    return sig;
  }
}
