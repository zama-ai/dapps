"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { useZamaReady } from "~~/components/DappWrapperWithProviders";
import { PrivyConnectButton } from "~~/components/helper/PrivyConnectButton";
import { useERC7984Wagmi } from "~~/hooks/erc7984/useERC7984Wagmi";
import { useDeployedContractInfo, useIsSmartWallet } from "~~/hooks/helper";
import type { AllowedChainIds } from "~~/utils/helper/networks";
import { notification } from "~~/utils/helper/notification";

export const ERC7984Demo = () => {
  const { isConnected } = useAccount();
  const zamaReady = useZamaReady();

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-6 min-h-[60vh] flex items-center justify-center relative z-10">
        <div className="glass-card-strong p-12 text-center max-w-md">
          <div className="mb-6">
            <span className="inline-flex items-center justify-center w-20 h-20 bg-[#FFD208] text-5xl">⚠️</span>
          </div>
          <h2 className="text-3xl font-bold text-[#2D2D2D] mb-3">Wallet not connected</h2>
          <p className="text-[#2D2D2D]/80 mb-8 text-lg">
            Connect your wallet to use the ERC7984 confidential token demo.
          </p>
          <div className="flex items-center justify-center">
            <PrivyConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (!zamaReady) {
    return (
      <div className="max-w-6xl mx-auto p-6 min-h-[60vh] flex items-center justify-center relative z-10">
        <div className="glass-card-strong p-12 text-center max-w-md">
          <p className="text-[#2D2D2D]/80 text-lg">Initializing FHE SDK...</p>
        </div>
      </div>
    );
  }

  return <ERC7984Connected />;
};

const ERC7984Connected = () => {
  const { chain, address } = useAccount();
  const { isSmartWallet } = useIsSmartWallet();
  const erc7984 = useERC7984Wagmi();

  // Airdrop
  const chainId = chain?.id;
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: airdropContract } = useDeployedContractInfo({ contractName: "Airdrop", chainId: allowedChainId });
  const [claimStatus, setClaimStatus] = useState<"idle" | "checking" | "claiming" | "claimed" | "error">("idle");
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);

  useEffect(() => {
    if (!address || !erc7984.ethersSigner || !airdropContract || !erc7984.contractAddress) return;

    setClaimStatus("checking");
    const contract = new ethers.Contract(airdropContract.address, airdropContract.abi, erc7984.ethersSigner);
    contract
      .hasClaimed(address, erc7984.contractAddress)
      .then((claimed: boolean) => {
        setAlreadyClaimed(claimed);
        setClaimStatus(claimed ? "claimed" : "idle");
      })
      .catch(() => setClaimStatus("idle"));
  }, [address, erc7984.ethersSigner, airdropContract, erc7984.contractAddress]);

  const handleClaim = async () => {
    if (!erc7984.ethersSigner || !address || !airdropContract || !erc7984.contractAddress) return;

    setClaimStatus("claiming");
    try {
      const contract = new ethers.Contract(airdropContract.address, airdropContract.abi, erc7984.ethersSigner);
      notification.info("Claiming tokens...");
      const tx = await contract.claim(erc7984.contractAddress);
      notification.info("Transaction submitted. Waiting for confirmation...");
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        notification.success("Successfully claimed tokens!");
        setClaimStatus("claimed");
        setAlreadyClaimed(true);
        erc7984.refreshBalance();
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error: any) {
      if (error.message?.includes("AlreadyClaimed")) {
        notification.error("You have already claimed tokens");
        setAlreadyClaimed(true);
        setClaimStatus("claimed");
      } else if (error.message?.includes("user rejected")) {
        notification.error("Transaction cancelled");
        setClaimStatus("idle");
      } else {
        notification.error("Failed to claim tokens");
        setClaimStatus("error");
        setTimeout(() => setClaimStatus(alreadyClaimed ? "claimed" : "idle"), 2000);
      }
    }
  };

  // Transfer
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("1");

  // Styles
  const btn =
    "glass-button inline-flex items-center justify-center px-6 py-3 font-semibold transition-all duration-300 focus-visible:outline-none disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed";
  const btnPrimary = btn + " text-[#2D2D2D] cursor-pointer";
  const btnSecondary = btn + " !bg-[#2D2D2D] text-[#F4F4F4] hover:!bg-[#A38025] cursor-pointer";
  const btnSuccess = btn + " !bg-[#A38025] text-[#F4F4F4] hover:!bg-[#2D2D2D]";
  const section = "glass-card-strong p-8 mb-6 text-[#2D2D2D] relative z-10";
  const title = "font-semibold text-[#2D2D2D] text-2xl mb-4 pb-3 border-b border-[#2D2D2D]";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 relative z-10">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-4 text-[#2D2D2D] tracking-tight">ERC7984 Confidential Token Demo</h1>
        <p className="text-xl text-[#2D2D2D]/70">
          Interact with the Fully Homomorphic Encryption confidential token contract
        </p>
      </div>

      {isSmartWallet && (
        <div className="glass-card-strong p-6 mb-6 border-2 border-[#FFD208] bg-[#FFD208]/10">
          <div className="flex items-start gap-4">
            <span className="text-3xl">⚠️</span>
            <div>
              <h3 className="font-bold text-[#2D2D2D] text-lg mb-2">Smart Wallet Detected</h3>
              <p className="text-[#2D2D2D]/80 mb-3">
                You&apos;re using a smart contract wallet (like Coinbase Smart Wallet or Safe). FHE balance decryption
                is <strong>not currently supported</strong> with smart wallets due to signature format
                incompatibilities.
              </p>
              <p className="text-[#2D2D2D]/70 text-sm">
                <strong>Workaround:</strong> Connect with a regular wallet (EOA) like MetaMask.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Balance */}
      <div className={section}>
        <h3 className={title}>Confidential Balance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#2D2D2D]/60 mb-2">Encrypted Handle</h4>
            <Property name="Handle" value={erc7984.handle || "No handle available"} truncate />
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#2D2D2D]/60 mb-2">Decrypted Value</h4>
            <Property name="Balance" value={erc7984.isDecrypted ? erc7984.clear : "Not decrypted yet"} />
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#2D2D2D]/60 mb-2">Your Address</h4>
            <Property name="Address" value={erc7984.address || "N/A"} truncate />
          </div>
          <div className="flex flex-col justify-center">
            <h4 className="text-sm font-semibold text-[#2D2D2D]/60 mb-2">Faucet</h4>
            <button
              className={(alreadyClaimed ? btnSuccess : btnPrimary) + " w-full"}
              onClick={handleClaim}
              disabled={!address || claimStatus === "claiming" || claimStatus === "checking" || alreadyClaimed}
            >
              {!address
                ? "Connect Wallet"
                : claimStatus === "checking"
                  ? "Checking..."
                  : claimStatus === "claiming"
                    ? "Claiming Tokens..."
                    : alreadyClaimed
                      ? "Already Claimed"
                      : "Get Free Tokens"}
            </button>
          </div>
        </div>
      </div>

      {/* Balance Status */}
      <div className="grid grid-cols-1 gap-4 text-black">
        <div className={erc7984.isDecrypted ? btnSuccess : btnPrimary}>
          {erc7984.isDecrypted
            ? `Balance: ${erc7984.clear}`
            : erc7984.isRefreshing
              ? "Loading balance..."
              : "No balance available"}
        </div>
      </div>

      {/* Transfer */}
      <div className={section}>
        <h3 className={title}>Transfer Confidential Tokens</h3>
        <div className="space-y-5">
          <div>
            <label htmlFor="transferTo" className="block text-sm font-semibold text-[#2D2D2D] mb-2">
              Recipient Address
            </label>
            <input
              id="transferTo"
              type="text"
              placeholder="0x..."
              value={transferTo}
              onChange={e => setTransferTo(e.target.value)}
              className="glass-input w-full px-4 py-3 text-[#2D2D2D] placeholder:text-[#2D2D2D]/40"
            />
          </div>
          <div>
            <label htmlFor="transferAmount" className="block text-sm font-semibold text-[#2D2D2D] mb-2">
              Amount
            </label>
            <input
              id="transferAmount"
              type="number"
              placeholder="1"
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value)}
              className="glass-input w-full px-4 py-3 text-[#2D2D2D] placeholder:text-[#2D2D2D]/40"
            />
          </div>
          <button
            className={btnSecondary + " w-full"}
            disabled={!erc7984.canTransfer || !transferTo || !transferAmount}
            onClick={() => erc7984.transferTokens(transferTo, Number(transferAmount))}
          >
            {erc7984.canTransfer && transferTo && transferAmount
              ? `Transfer ${transferAmount} tokens`
              : erc7984.isProcessing
                ? "Processing transfer..."
                : "Cannot transfer"}
          </button>
        </div>
      </div>

      {erc7984.message && (
        <div className={section}>
          <h3 className={title}>Messages</h3>
          <div className="glass-card p-5">
            <p className="text-[#2D2D2D] font-medium">{erc7984.message}</p>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={section}>
          <h3 className={title}>Connection</h3>
          <div className="space-y-3">
            <Property name="Connected" value={erc7984.isConnected} />
            <Property name="Chain ID" value={erc7984.chainId ?? "N/A"} />
            <Property name="Contract" value={erc7984.contractAddress ?? "N/A"} truncate />
          </div>
        </div>
        <div className={section}>
          <h3 className={title}>Token Status</h3>
          <div className="space-y-3">
            <Property name="Refreshing" value={erc7984.isRefreshing} />
            <Property name="Processing" value={erc7984.isProcessing} />
            <Property name="Can Transfer" value={erc7984.canTransfer} />
            <Property name="Decrypted" value={erc7984.isDecrypted} />
          </div>
        </div>
      </div>
    </div>
  );
};

function Property({ name, value, truncate }: { name: string; value: unknown; truncate?: boolean }) {
  if (typeof value === "boolean") {
    return (
      <div className="flex flex-col gap-2 py-3 px-4 glass-card w-full">
        <span className="text-[#2D2D2D]/70 font-medium text-xs">{name}</span>
        <span
          className={`font-mono text-sm font-bold px-3 py-1.5 text-center ${value ? "text-[#F4F4F4] bg-[#A38025]" : "text-[#F4F4F4] bg-[#2D2D2D]"}`}
        >
          {value ? "true" : "false"}
        </span>
      </div>
    );
  }

  const display = value instanceof Error ? value.message : String(value ?? "undefined");
  const shouldTruncate = truncate && display.length > 12;
  const shown = shouldTruncate ? `${display.slice(0, 6)}...${display.slice(-4)}` : display;

  return (
    <div className="flex flex-col gap-2 py-3 px-4 glass-card w-full group relative">
      <span className="text-[#2D2D2D]/70 font-medium text-xs">{name}</span>
      <span
        className={`font-mono text-sm font-bold text-[#2D2D2D] bg-[#E8E8E8] px-3 py-1.5 text-center${shouldTruncate ? " cursor-help" : ""}`}
      >
        {shown}
      </span>
      {shouldTruncate && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#2D2D2D] text-[#F4F4F4] text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-xs break-all">
          <div className="font-mono">{display}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-[#2D2D2D]"></div>
        </div>
      )}
    </div>
  );
}
