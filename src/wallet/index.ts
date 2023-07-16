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

export const getTokenSignature = async (contractAddress: string, userAddress: string) => {
  if (getInstance().hasKeypair(contractAddress)) {
    return getInstance().getTokenSignature(contractAddress)!;
  } else {
    const { publicKey, token } = getInstance().generateToken({ verifyingContract: contractAddress });
    const params = [userAddress, JSON.stringify(token)];
    const signature: string = await window.ethereum.request({ method: 'eth_signTypedData_v4', params });
    getInstance().setTokenSignature(contractAddress, signature);
    return { signature, publicKey };
  }
};
