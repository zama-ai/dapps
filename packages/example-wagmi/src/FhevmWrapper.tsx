import type { PropsWithChildren } from "react";
import { useConnection, useConnectorClient } from "wagmi";
import { FhevmProvider, memoryStorage, type Eip1193Provider } from "fhevm-sdk";
import { fhevmConfig } from "./fhevmConfig";

export function FhevmWrapper({ children }: PropsWithChildren) {
  const connection = useConnection();
  const { data: connectorClient } = useConnectorClient();

  // Get EIP-1193 provider from wagmi connector client
  const provider = connectorClient?.transport as Eip1193Provider | undefined;

  // Extract values from useConnection
  const address = connection.addresses?.[0];
  const chainId = connection.chainId;
  const isConnected = connection.status === "connected";

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={provider}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage}
      // Cast children to avoid React version type mismatch
      children={children as any}
    />
  );
}
