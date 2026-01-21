"use client";

import { Balance } from "../Balance";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { usePrivy } from "@privy-io/react-auth";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { useTargetNetwork } from "~~/hooks/helper/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/helper";

// Check if Privy is configured
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

/**
 * Privy Connect Button - Client-side only component
 */
const PrivyConnectButtonClient = () => {
  const { address, isConnected, chain } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const blockExplorerAddressLink = address ? getBlockExplorerAddressLink(targetNetwork, address) : undefined;

  // If Privy is not configured, show disabled button
  if (!PRIVY_APP_ID) {
    return (
      <button className="glass-button px-6 py-3 text-[#2D2D2D] font-semibold opacity-50" disabled type="button">
        Privy Not Configured
      </button>
    );
  }

  // Connected - show balance and address dropdown
  if (isConnected && address) {
    // Wrong network
    if (chain && chain.id !== targetNetwork.id) {
      return <WrongNetworkDropdown />;
    }

    return (
      <>
        <div className="flex flex-col items-center mr-1 text-[#2D2D2D]">
          <Balance address={address as Address} className="min-h-0 h-auto" />
          <span className="text-xs text-[#2D2D2D] font-medium">{chain?.name || targetNetwork.name}</span>
        </div>
        <AddressInfoDropdown
          address={address as Address}
          displayName={address.slice(0, 6) + "..." + address.slice(-4)}
          ensAvatar={undefined}
          blockExplorerAddressLink={blockExplorerAddressLink}
        />
      </>
    );
  }

  // Not connected - show connect button using Privy
  return <PrivyConnectButtonInner />;
};

/**
 * Inner component that uses usePrivy hook
 */
const PrivyConnectButtonInner = () => {
  const { connectWallet, ready } = usePrivy();

  if (!ready) {
    return (
      <button className="glass-button px-6 py-3 text-[#2D2D2D] font-semibold opacity-50" disabled type="button">
        Loading...
      </button>
    );
  }

  return (
    <button
      className="glass-button px-6 py-3 text-[#2D2D2D] font-semibold cursor-pointer"
      onClick={() => connectWallet()}
      type="button"
    >
      Connect Wallet
    </button>
  );
};

export default PrivyConnectButtonClient;
