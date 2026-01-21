import * as chains from "viem/chains";

export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  rpcOverrides?: Record<number, string>;
};

export type ScaffoldConfig = BaseConfig;

const rawAlchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
if (!rawAlchemyKey && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_ALCHEMY_API_KEY is not set. Falling back to public RPCs.");
}

const isProduction = process.env.NODE_ENV === "production";
const baseTargets = [chains.sepolia] as const;
// Sepolia first, then hardhat (so Sepolia is default and hardhat is optional)
const targetNetworks = isProduction ? baseTargets : ([...baseTargets, chains.hardhat] as const);

const scaffoldConfig = {
  // The networks on which your DApp is live
  targetNetworks,
  // The interval at which your front-end polls the RPC servers for new data (it has no effect if you only target the local network (default is 4000))
  pollingInterval: 30000,
  // This is ours Alchemy's default API key.
  // You can get your own at https://dashboard.alchemyapi.io
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  alchemyApiKey: rawAlchemyKey || "",
  // If you want to use a different RPC for a specific network, you can add it here.
  // The key is the chain ID, and the value is the HTTP RPC URL
  rpcOverrides: {
    // Example:
    // [chains.mainnet.id]: "https://mainnet.rpc.buidlguidl.com",
  },
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
