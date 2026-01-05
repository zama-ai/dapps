import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["fhevm-sdk"],
  // Exclude Node.js packages that are incompatible with Turbopack bundling
  serverExternalPackages: ["pino", "thread-stream", "pino-pretty"],
  // Configure webpack fallbacks for client-side (these packages shouldn't be bundled for browser)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
      };
    }
    return config;
  },
};

export default nextConfig;
