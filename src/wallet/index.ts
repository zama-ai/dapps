import { createInstance, initFhevm, FhevmInstance } from 'fhevmjs';

let instance: FhevmInstance;

export const init = async () => {
  if (!instance) {
    await initFhevm();
  }
};

export const setInstance = (fhevmInstance: FhevmInstance) => {
  instance = fhevmInstance;
};

export const getInstance = () => {
  return instance;
};

export const getPublicKeySignature = async (contractAddress: string, userAddress: string) => {
  if (getInstance().hasKeypair(contractAddress)) {
    return getInstance().getPublicKey(contractAddress)!;
  } else {
    const { publicKey, eip712 } = getInstance().generatePublicKey({ verifyingContract: contractAddress });
    const params = [userAddress, JSON.stringify(eip712)];
    const signature: string = await window.ethereum.request({ method: 'eth_signTypedData_v4', params });
    getInstance().setSignature(contractAddress, signature);
    return { signature, publicKey };
  }
};
