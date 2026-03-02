"use client";

import { createContext, useContext, useMemo } from "react";
import { HardhatConfig, MemoryStorage, RelayerWeb, SepoliaConfig, ZamaProvider } from "@zama-fhe/react-sdk";
import { EthersSigner } from "@zama-fhe/sdk/ethers";
import { ethers } from "ethers";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { useWalletClient } from "wagmi";
import { Providers } from "~~/app/providers";
import { Header } from "~~/components/Header";

const ZamaReadyContext = createContext(false);
export const useZamaReady = () => useContext(ZamaReadyContext);

const storage = new MemoryStorage();

const FhevmWrapper = ({ children }: { children: React.ReactNode }) => {
  const { data: walletClient } = useWalletClient();

  const signer = useMemo(() => {
    if (!walletClient) return undefined;

    const eip1193Provider = {
      request: async (args: any) => walletClient.request(args),
      on: () => {},
      removeListener: () => {},
    } as ethers.Eip1193Provider;

    const browserProvider = new ethers.BrowserProvider(eip1193Provider);
    return new EthersSigner({ signer: browserProvider });
  }, [walletClient]);

  const relayer = useMemo(() => {
    if (!signer) return undefined;
    return new RelayerWeb({
      getChainId: () => signer.getChainId(),
      transports: {
        [11155111]: SepoliaConfig,
        [31337]: HardhatConfig,
      },
    });
  }, [signer]);

  if (!signer || !relayer) {
    return <ZamaReadyContext.Provider value={false}>{children}</ZamaReadyContext.Provider>;
  }

  return (
    <ZamaReadyContext.Provider value={true}>
      <ZamaProvider relayer={relayer} signer={signer} storage={storage}>
        {children}
      </ZamaProvider>
    </ZamaReadyContext.Provider>
  );
};

export const DappWrapperWithProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <Providers>
      <ProgressBar height="3px" color="#FFD208" />
      <div className={`flex flex-col min-h-screen`}>
        <Header />
        <main className="relative flex flex-col flex-1 z-10">
          <FhevmWrapper>{children}</FhevmWrapper>
        </main>
      </div>
      <Toaster />
    </Providers>
  );
};
