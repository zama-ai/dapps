import type { ZamaWeb3Instance } from 'zama-web3';
import { SNAP_ORIGIN } from './constants';

let instance: ZamaWeb3Instance;

const init = async () => {
  if (!instance) {
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    await window.zamaWeb3.initZamaWeb3();
    const { publicKey } = window.zamaWeb3.createTFHEKey();
    instance = window.zamaWeb3.createInstance({ chainId, publicKey });
  }
};

export const encrypt = async (value: number) => {
  await init();
  return instance.encryptInteger(value);
};

export const generateToken = async (verifyingContract: string) => {
  await init();
  return instance.generateToken({
    verifyingContract,
  });
};

export const callAndDecrypt = async (
  provider: any,
  params: {
    account: string;
    abi: any;
    address: string;
    method: string;
    params?: any;
  }
) =>
  provider.send('wallet_invokeSnap', {
    snapId: SNAP_ORIGIN,
    request: {
      method: 'zama_call',
      params,
    },
  });

export const connectWallet = async (provider: any) => {
  return provider.send('wallet_requestSnaps', {
    [SNAP_ORIGIN]: {},
  });
};
