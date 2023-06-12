import type { initZamaWeb3, createInstance, createTFHEKey } from 'zama-web3/lib/web';
/* eslint-disable */

declare module '*.png' {
  var text: string;
  export default text;
}

declare global {
  interface Window {
    zamaWeb3: {
      initZamaWeb3: typeof initZamaWeb3;
      createInstance: typeof createInstance;
      createTFHEKey: typeof createTFHEKey;
    };
    ethereum: any;
  }
}
