import { SNAP_ORIGIN } from './constants';

export const encrypt = async (provider: any, value: number) => {
  return provider.send('wallet_invokeSnap', {
    snapId: SNAP_ORIGIN,
    request: {
      method: 'zama_encryptWithPublicKey',
      params: [value],
    },
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
  },
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
