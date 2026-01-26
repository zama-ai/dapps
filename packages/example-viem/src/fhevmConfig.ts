import { createFhevmConfig, sepolia, hardhatLocal } from "fhevm-sdk";

export const fhevmConfig = createFhevmConfig({
  chains: [sepolia, hardhatLocal],
});
