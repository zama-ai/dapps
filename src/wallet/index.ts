import type { FhevmInstance } from 'fhevmjs';
import { BrowserProvider } from 'ethers';

let instance: FhevmInstance;

export const init = async () => {
  if (!instance) {
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const provider = new BrowserProvider((global as any).ethereum);
    const publicKey = await provider.call({ from: null, to: '0x0000000000000000000000000000000000000044' });
    const chainId = parseInt(chainIdHex, 16);
    await window.fhevm.initFhevm();
    instance = window.fhevm.createInstance({ chainId, publicKey: publicKey.substring(2) });
  }
};

export const getInstance = () => {
  return instance;
};

export const getTokenSignature = async (contractAddress: string, userAddress: string) => {
  if (getInstance().hasKeypair(contractAddress)) {
    return getInstance().getTokenSignature(contractAddress)!;
  } else {
    const { publicKey, token } = await getInstance().generateToken({ verifyingContract: contractAddress });
    const params = [userAddress, JSON.stringify(token)];
    const signature: string = await window.ethereum.request({ method: 'eth_signTypedData_v4', params });
    getInstance().setTokenSignature(contractAddress, signature);
    return { signature, publicKey };
  }
};
