import type { initFhevm, createInstance, createTFHEKey } from 'fhevmjs/lib/web';
/* eslint-disable */

declare module '*.png' {
  var text: string;
  export default text;
}

declare global {
  interface Window {
    fhevm: {
      initFhevm: typeof initFhevm;
      createInstance: typeof createInstance;
      createTFHEKey: typeof createTFHEKey;
    };
    ethereum: any;
  }
}
