"use client";

import { Balance } from "../Balance";
import { AddressInfoDropdown } from "./AddressInfoDropdown";
import { WrongNetworkDropdown } from "./WrongNetworkDropdown";
import { usePrivy } from "@privy-io/react-auth";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { useTargetNetwork } from "~~/hooks/helper/useTargetNetwork";
import { getBlockExplorerAddressLink } from "~~/utils/helper";

/**
 * Privy Connect Button with custom design
 */
export const PrivyConnectButton = () => {
  const { connectWallet, ready } = usePrivy();
  const { address, isConnected, chain } = useAccount();
  const { targetNetwork } = useTargetNetwork();

  const blockExplorerAddressLink = address ? getBlockExplorerAddressLink(targetNetwork, address) : undefined;

  // Not ready yet
  if (!ready) {
    return (
      <button className="glass-button px-6 py-3 text-[#2D2D2D] font-semibold opacity-50" disabled type="button">
        Loading...
      </button>
    );
  }

  // Not connected
  if (!isConnected || !address) {
    return (
      <button
        className="glass-button px-6 py-3 text-[#2D2D2D] font-semibold cursor-pointer"
        onClick={() => connectWallet()}
        type="button"
      >
        Connect Wallet
      </button>
    );
  }

  // Wrong network
  if (chain && chain.id !== targetNetwork.id) {
    return <WrongNetworkDropdown />;
  }

  // Connected - show balance and address dropdown
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
};
