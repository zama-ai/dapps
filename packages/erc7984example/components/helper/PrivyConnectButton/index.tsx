"use client";

import dynamic from "next/dynamic";

// Dynamically import the actual component with SSR disabled to avoid hydration issues
const PrivyConnectButtonClient = dynamic(() => import("./PrivyConnectButtonClient"), {
  ssr: false,
  loading: () => (
    <button className="glass-button px-6 py-3 text-[#2D2D2D] font-semibold opacity-50" disabled type="button">
      Loading...
    </button>
  ),
});

/**
 * Privy Connect Button wrapper - uses dynamic import with ssr: false
 */
export const PrivyConnectButton = () => {
  return <PrivyConnectButtonClient />;
};
