import {
  clientKeyDecryptor,
  createEIP712,
  createInstance as createFhevmInstance,
  generateKeypair,
  getCiphertextCallParams,
} from "fhevmjs";
import { FhevmInstance } from "fhevmjs/node";
import { readFileSync } from "fs";
import { ethers, ethers as hethers, network } from "hardhat";
import { homedir } from "os";
import path from "path";

import { ACL_ADDRESS, GATEWAY_URL, KMSVERIFIER_ADDRESS } from "./constants";
import { awaitCoprocessor, getClearText } from "./coprocessorUtils";
import { createEncryptedInputMocked, reencryptRequestMocked } from "./fhevmjsMocked";

const FHE_CLIENT_KEY_PATH = process.env.FHE_CLIENT_KEY_PATH;

let clientKey: Uint8Array | undefined;

const kmsAdd = KMSVERIFIER_ADDRESS;
const aclAdd = ACL_ADDRESS;

export const createInstance = async (): Promise<FhevmInstance> => {
  if (network.name === "hardhat") {
    const instance = {
      reencrypt: reencryptRequestMocked,
      createEncryptedInput: createEncryptedInputMocked,
      getPublicKey: () => "0xFFAA44433",
      generateKeypair: generateKeypair,
      createEIP712: createEIP712(network.config.chainId),
    };
    return instance;
  } else {
    const instance = await createFhevmInstance({
      kmsContractAddress: kmsAdd,
      aclContractAddress: aclAdd,
      networkUrl: network.config.url,
      gatewayUrl: GATEWAY_URL,
    });
    return instance;
  }
};

const getCiphertext = async (handle: bigint, ethers: typeof hethers): Promise<string> => {
  return ethers.provider.call(getCiphertextCallParams(handle));
};

const getDecryptor = () => {
  if (clientKey == null) {
    if (FHE_CLIENT_KEY_PATH) {
      clientKey = readFileSync(FHE_CLIENT_KEY_PATH);
    } else {
      const home = homedir();
      const clientKeyPath = path.join(home, "network-fhe-keys/cks");
      clientKey = readFileSync(clientKeyPath);
    }
  }
  return clientKeyDecryptor(clientKey);
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bool}
 */
export const decryptBool = async (handle: bigint): Promise<boolean> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return (await getClearText(handle)) === "1";
  } else {
    return getDecryptor().decryptBool(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bigint}
 */
export const decrypt4 = async (handle: bigint): Promise<bigint> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return BigInt(await getClearText(handle));
  } else {
    return getDecryptor().decrypt4(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bigint}
 */
export const decrypt8 = async (handle: bigint): Promise<bigint> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return BigInt(await getClearText(handle));
  } else {
    return getDecryptor().decrypt8(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bigint}
 */
export const decrypt16 = async (handle: bigint): Promise<bigint> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return BigInt(await getClearText(handle));
  } else {
    return getDecryptor().decrypt16(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bigint}
 */
export const decrypt32 = async (handle: bigint): Promise<bigint> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return BigInt(await getClearText(handle));
  } else {
    return getDecryptor().decrypt32(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bigint}
 */
export const decrypt64 = async (handle: bigint): Promise<bigint> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return BigInt(await getClearText(handle));
  } else {
    return getDecryptor().decrypt64(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bigint}
 */
export const decrypt128 = async (handle: bigint): Promise<bigint> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return BigInt(await getClearText(handle));
  } else {
    return getDecryptor().decrypt128(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bigint}
 */
export const decrypt256 = async (handle: bigint): Promise<bigint> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return BigInt(await getClearText(handle));
  } else {
    return getDecryptor().decrypt256(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {string}
 */
export const decryptAddress = async (handle: bigint): Promise<string> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    const bigintAdd = BigInt(await getClearText(handle));
    const handleStr = "0x" + bigintAdd.toString(16).padStart(40, "0");
    return handleStr;
  } else {
    return getDecryptor().decryptAddress(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bigint}
 */
export const decryptEbytes64 = async (handle: bigint): Promise<bigint> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return BigInt(await getClearText(handle));
  } else {
    return getDecryptor().decryptEbytes64(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bigint}
 */
export const decryptEbytes128 = async (handle: bigint): Promise<bigint> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return BigInt(await getClearText(handle));
  } else {
    return getDecryptor().decryptEbytes128(await getCiphertext(handle, ethers));
  }
};

/**
 * @debug
 * This function is intended for debugging purposes only.
 * It cannot be used in production code, since it requires the FHE private key for decryption.
 * In production, decryption is only possible via an asyncronous on-chain call to the Gateway.
 *
 * @param {bigint} a handle to decrypt
 * @returns {bigint}
 */
export const decryptEbytes256 = async (handle: bigint): Promise<bigint> => {
  if (network.name === "hardhat") {
    await awaitCoprocessor();
    return BigInt(await getClearText(handle));
  } else {
    return getDecryptor().decryptEbytes256(await getCiphertext(handle, ethers));
  }
};
