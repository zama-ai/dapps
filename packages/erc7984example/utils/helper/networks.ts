import * as chains from "viem/chains";
import scaffoldConfig from "~~/scaffold.config";

type ChainAttributes = {
  color: string | [string, string];
  nativeCurrencyTokenAddress?: string;
};

export type ChainWithAttributes = chains.Chain & Partial<ChainAttributes>;
export type AllowedChainIds = (typeof scaffoldConfig.targetNetworks)[number]["id"];

export const NETWORKS_EXTRA_DATA: Record<string, ChainAttributes> = {
  [chains.hardhat.id]: { color: "#b8af0c" },
  [chains.sepolia.id]: { color: ["#5f4bb6", "#87ff65"] },
};

export function getBlockExplorerAddressLink(network: chains.Chain, address: string) {
  const blockExplorerBaseURL = network.blockExplorers?.default?.url;
  if (network.id === chains.hardhat.id) {
    return `/blockexplorer/address/${address}`;
  }
  if (!blockExplorerBaseURL) {
    return `https://etherscan.io/address/${address}`;
  }
  return `${blockExplorerBaseURL}/address/${address}`;
}

export function getTargetNetworks(): ChainWithAttributes[] {
  return scaffoldConfig.targetNetworks.map(targetNetwork => ({
    ...targetNetwork,
    ...NETWORKS_EXTRA_DATA[targetNetwork.id],
  }));
}
