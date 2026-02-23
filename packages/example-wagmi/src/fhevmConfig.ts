import { createFhevmConfig, sepolia, hardhatLocal } from "@zama-fhe/react-sdk";

export const fhevmConfig = createFhevmConfig({
  chains: [sepolia, hardhatLocal],
});
