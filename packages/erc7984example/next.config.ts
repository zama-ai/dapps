import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Rewrite WASM requests to the API proxy (SDK looks for them at root)
      {
        source: "/tfhe_bg.wasm",
        destination: "/api/relayer-sdk/bundle/tfhe_bg.wasm",
      },
      {
        source: "/kms_lib_bg.wasm",
        destination: "/api/relayer-sdk/bundle/kms_lib_bg.wasm",
      },
    ];
  },
};

export default nextConfig;
