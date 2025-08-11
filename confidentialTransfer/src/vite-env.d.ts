/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROJECT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ethereum: import('ethers').Eip1193Provider & {
    on: (event: string, cb: (param: unknown) => void) => void;
  };
  fhevmjs: import('fhevmjs');
  fhevmjsInitialized: boolean;
}
