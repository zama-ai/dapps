"use client";

import { InMemoryStorageProvider } from "fhevm-sdk";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { Providers } from "~~/app/providers";
import { Header } from "~~/components/Header";

export const DappWrapperWithProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <Providers>
      <ProgressBar height="3px" color="#FFD208" />
      <div className={`flex flex-col min-h-screen`}>
        <Header />
        <main className="relative flex flex-col flex-1 z-10">
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        </main>
      </div>
      <Toaster />
    </Providers>
  );
};
