import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["fhevm-sdk"],
  // Exclude Node.js packages that are incompatible with Turbopack bundling
  serverExternalPackages: ["pino", "thread-stream", "pino-pretty"],
  // Turbopack: resolve Node.js built-ins to empty modules for client bundle
  turbopack: {
    resolveAlias: {
      fs: "./empty-module.js",
      net: "./empty-module.js",
      tls: "./empty-module.js",
      child_process: "./empty-module.js",
      worker_threads: "./empty-module.js",
    },
  },
  // Configure webpack fallbacks for client-side (these packages shouldn't be bundled for browser)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: require.resolve("./empty-module.js"),
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
