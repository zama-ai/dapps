import { createFhevmConfig, sepolia, hardhatLocal } from "@zama-fhe/sdk";

export const fhevmConfig = createFhevmConfig({
  chains: [sepolia, hardhatLocal],
});
