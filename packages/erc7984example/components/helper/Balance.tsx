"use client";

import { Address, formatEther } from "viem";
import { useTargetNetwork } from "~~/hooks/helper/useTargetNetwork";
import { useWatchBalance } from "~~/hooks/helper/useWatchBalance";

type BalanceProps = {
  address?: Address;
  className?: string;
  usdMode?: boolean;
};

/**
 * Display (ETH & USD) balance of an ETH address.
 */
export const Balance = ({ address, className = "" }: BalanceProps) => {
  const { targetNetwork } = useTargetNetwork();

  const {
    data: balance,
    isError,
    isLoading,
  } = useWatchBalance({
    address,
  });

  if (!address || isLoading || balance === null) {
    return (
      <div className="animate-pulse flex space-x-2">
        <div className="rounded-md bg-[rgba(255,214,10,0.3)] h-4 w-20"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass-card rounded-xl px-3 py-1 flex flex-col items-center max-w-fit">
        <div className="text-[#FF9F0A] font-semibold">Error</div>
      </div>
    );
  }

  const formattedBalance = balance ? Number(formatEther(balance.value)) : 0;

  return (
    <div className={`flex flex-col font-normal items-center ${className}`}>
      <div className="w-full flex items-center justify-center">
        <>
          <span className="font-semibold text-[#1d1d1f]">{formattedBalance.toFixed(4)}</span>
          <span className="text-sm font-bold ml-1 text-[#1d1d1f]">{targetNetwork.nativeCurrency.symbol}</span>
        </>
      </div>
    </div>
  );
};
