"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { useFhevmStatus, useFhevmContext } from "fhevm-sdk";
import { useAccount } from "wagmi";
import { PrivyConnectButton } from "~~/components/helper/PrivyConnectButton";
import { useERC7984Wagmi } from "~~/hooks/erc7984/useERC7984Wagmi";
import { useDeployedContractInfo, useIsSmartWallet } from "~~/hooks/helper";
import type { AllowedChainIds } from "~~/utils/helper/networks";
import { notification } from "~~/utils/helper/notification";

/*
 * Main ERC7984 React component for interacting with confidential tokens
 *  - "Decrypt" button: allows you to decrypt the current balance handle
 *  - "Transfer" button: allows you to transfer tokens using FHE operations
 *
 * FHEVM instance is now provided via FhevmProvider context (no setup needed here)
 */
export const ERC7984Demo = () => {
  const { isConnected, chain, address } = useAccount();
  const { isSmartWallet } = useIsSmartWallet();

  const chainId = chain?.id;

  //////////////////////////////////////////////////////////////////////////////
  // FHEVM status from context (no boilerplate needed!)
  //////////////////////////////////////////////////////////////////////////////

  const { status: fhevmStatus, error: fhevmError, isReady: fhevmIsReady } = useFhevmStatus();
  const { instance: fhevmInstance } = useFhevmContext();

  //////////////////////////////////////////////////////////////////////////////
  // useERC7984 is a custom hook containing all the ERC7984 logic, including
  // - calling the ERC7984 contract
  // - encrypting FHE inputs
  // - decrypting FHE handles
  // Instance is retrieved from FhevmProvider context automatically
  //////////////////////////////////////////////////////////////////////////////

  const erc7984 = useERC7984Wagmi();

  //////////////////////////////////////////////////////////////////////////////
  // Airdrop/Faucet state and logic
  //////////////////////////////////////////////////////////////////////////////

  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: airdropContract } = useDeployedContractInfo({ contractName: "Airdrop", chainId: allowedChainId });

  const [claimStatus, setClaimStatus] = useState<"idle" | "checking" | "claiming" | "claimed" | "error">("idle");
  const [alreadyClaimed, setAlreadyClaimed] = useState<boolean>(false);

  // Check if user has already claimed
  useEffect(() => {
    async function checkClaimStatus() {
      if (!address || !erc7984.ethersSigner || !airdropContract || !erc7984.contractAddress) return;

      setClaimStatus("checking");
      try {
        const contract = new ethers.Contract(airdropContract.address, airdropContract.abi, erc7984.ethersSigner);

        const claimed = await contract.hasClaimed(address, erc7984.contractAddress);
        setAlreadyClaimed(claimed);
        setClaimStatus(claimed ? "claimed" : "idle");
      } catch (error) {
        console.error("Error checking claim status:", error);
        setClaimStatus("idle");
      }
    }

    checkClaimStatus();
  }, [address, erc7984.ethersSigner, airdropContract, erc7984.contractAddress]);

  const handleClaim = async () => {
    if (!erc7984.ethersSigner || !address || !airdropContract || !erc7984.contractAddress) {
      notification.error("Please connect your wallet first");
      return;
    }

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
        // Refresh balance after claim
        erc7984.refreshBalanceHandle();
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error: any) {
      console.error("Claim error:", error);

      let errorMessage = "Failed to claim tokens";

      if (error.message?.includes("AlreadyClaimed")) {
        errorMessage = "You have already claimed tokens";
        setAlreadyClaimed(true);
        setClaimStatus("claimed");
      } else if (error.message?.includes("user rejected")) {
        errorMessage = "Transaction cancelled";
        setClaimStatus("idle");
      } else {
        setClaimStatus("error");
      }

      notification.error(errorMessage);

      setTimeout(() => {
        setClaimStatus(alreadyClaimed ? "claimed" : "idle");
      }, 2000);
    }
  };

  //////////////////////////////////////////////////////////////////////////////
  // Transfer state
  //////////////////////////////////////////////////////////////////////////////

  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<string>("1");

  //////////////////////////////////////////////////////////////////////////////
  // UI Stuff:
  // --------
  // A basic page containing
  // - A bunch of debug values allowing you to better visualize the React state
  // - 1x "Decrypt" button (to decrypt the latest balance handle)
  // - Transfer form with amount and recipient
  //////////////////////////////////////////////////////////////////////////////

  const buttonClass =
    "glass-button inline-flex items-center justify-center px-6 py-3 font-semibold " +
    "transition-all duration-300 " +
    "focus-visible:outline-none " +
    "disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed";

  // Primary (accent) button
  const primaryButtonClass = buttonClass + " text-[#2D2D2D] cursor-pointer";

  // Secondary button
  const secondaryButtonClass = buttonClass + " !bg-[#2D2D2D] text-[#F4F4F4] hover:!bg-[#A38025] cursor-pointer";

  // Success/confirmed state
  const successButtonClass = buttonClass + " !bg-[#A38025] text-[#F4F4F4] hover:!bg-[#2D2D2D]";

  const titleClass = "font-semibold text-[#2D2D2D] text-2xl mb-4 pb-3 border-b border-[#2D2D2D]";
  const sectionClass = "glass-card-strong p-8 mb-6 text-[#2D2D2D] relative z-10";

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

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 relative z-10">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-4 text-[#2D2D2D] tracking-tight">ERC7984 Confidential Token Demo</h1>
        <p className="text-xl text-[#2D2D2D]/70">
          Interact with the Fully Homomorphic Encryption confidential token contract
        </p>
      </div>

      {/* Smart Wallet Warning */}
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
                <strong>Workaround:</strong> Connect with a regular wallet (EOA) like MetaMask. Transfers will still
                work normally.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Balance Handle Display */}
      <div className={sectionClass}>
        <h3 className={titleClass}>💰 Confidential Balance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Column 1 - Encrypted Handle */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#2D2D2D]/60 mb-2">Encrypted Handle</h4>
            {printPropertyTruncated("Handle", erc7984.handle || "No handle available")}
          </div>

          {/* Column 2 - Decrypted Value */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#2D2D2D]/60 mb-2">Decrypted Value</h4>
            {printProperty("Balance", erc7984.isDecrypted ? erc7984.clear : "Not decrypted yet")}
          </div>

          {/* Column 3 - Your Address */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#2D2D2D]/60 mb-2">Your Address</h4>
            {printPropertyTruncated("Address", erc7984.address || "N/A")}
          </div>

          {/* Column 4 - Faucet */}
          <div className="flex flex-col justify-center">
            <h4 className="text-sm font-semibold text-[#2D2D2D]/60 mb-2">🚰 Faucet</h4>
            <button
              className={alreadyClaimed ? successButtonClass + " w-full" : primaryButtonClass + " w-full"}
              onClick={handleClaim}
              disabled={!address || claimStatus === "claiming" || claimStatus === "checking" || alreadyClaimed}
            >
              {!address
                ? "Connect Wallet"
                : claimStatus === "checking"
                  ? "⏳ Checking..."
                  : claimStatus === "claiming"
                    ? "⏳ Claiming Tokens..."
                    : alreadyClaimed
                      ? "✅ Already Claimed"
                      : "💧 Get Free Tokens"}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-4 text-black">
        <button
          className={erc7984.isDecrypted ? successButtonClass : primaryButtonClass}
          disabled={!erc7984.canDecrypt || isSmartWallet}
          onClick={erc7984.decryptBalanceHandle}
        >
          {isSmartWallet
            ? "🚫 Decrypt unavailable (Smart Wallet)"
            : erc7984.canDecrypt
              ? "🔓 Decrypt Balance"
              : erc7984.isDecrypted
                ? `✅ Decrypted: ${erc7984.clear}`
                : erc7984.isDecrypting
                  ? "⏳ Decrypting..."
                  : "❌ Nothing to decrypt"}
        </button>
      </div>

      {/* Messages */}
      {erc7984.message && (
        <div className={sectionClass}>
          <h3 className={titleClass}>💬 Messages</h3>
          <div className="glass-card p-5">
            <p className="text-[#2D2D2D] font-medium">{erc7984.message}</p>
          </div>
        </div>
      )}

      {/* Transfer Section */}
      <div className={sectionClass}>
        <h3 className={titleClass}>📤 Transfer Confidential Tokens</h3>
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
            className={secondaryButtonClass + " w-full"}
            disabled={!erc7984.canTransfer || !transferTo || !transferAmount}
            onClick={() => erc7984.transferTokens(transferTo, Number(transferAmount))}
          >
            {erc7984.canTransfer && transferTo && transferAmount
              ? `🔄 Transfer ${transferAmount} tokens`
              : erc7984.isProcessing
                ? "⏳ Processing transfer..."
                : "❌ Cannot transfer"}
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={sectionClass}>
          <h3 className={titleClass}>🔧 FHEVM Instance</h3>
          <div className="space-y-3">
            {printProperty("Instance Status", fhevmInstance ? "✅ Connected" : "❌ Disconnected")}
            {printProperty("Status", fhevmStatus)}
            {printProperty("Error", fhevmError ?? "No errors")}
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className={titleClass}>📊 Token Status</h3>
          <div className="space-y-3">
            {printProperty("Refreshing", erc7984.isRefreshing)}
            {printProperty("Decrypting", erc7984.isDecrypting)}
            {printProperty("Processing", erc7984.isProcessing)}
            {printProperty("Can Get Balance", erc7984.canGetBalance)}
            {printProperty("Can Decrypt", erc7984.canDecrypt)}
            {printProperty("Can Transfer", erc7984.canTransfer)}
          </div>
        </div>
      </div>
    </div>
  );
};

function printProperty(name: string, value: unknown) {
  let displayValue: string;

  if (typeof value === "boolean") {
    return printBooleanProperty(name, value);
  } else if (typeof value === "string" || typeof value === "number") {
    displayValue = String(value);
  } else if (typeof value === "bigint") {
    displayValue = String(value);
  } else if (value === null) {
    displayValue = "null";
  } else if (value === undefined) {
    displayValue = "undefined";
  } else if (value instanceof Error) {
    displayValue = value.message;
  } else {
    displayValue = JSON.stringify(value);
  }
  return (
    <div className="flex flex-col gap-2 py-3 px-4 glass-card w-full">
      <span className="text-[#2D2D2D]/70 font-medium text-xs">{name}</span>
      <span className="font-mono text-sm font-bold text-[#2D2D2D] bg-[#E8E8E8] px-3 py-1.5 text-center">
        {displayValue}
      </span>
    </div>
  );
}

function printPropertyTruncated(name: string, value: unknown) {
  let displayValue: string;

  if (typeof value === "string" || typeof value === "number") {
    displayValue = String(value);
  } else if (typeof value === "bigint") {
    displayValue = String(value);
  } else if (value === null) {
    displayValue = "null";
  } else if (value === undefined) {
    displayValue = "undefined";
  } else if (value instanceof Error) {
    displayValue = value.message;
  } else {
    displayValue = JSON.stringify(value);
  }

  // Truncate long strings
  const shouldTruncate = displayValue.length > 12;
  const truncatedValue = shouldTruncate ? `${displayValue.slice(0, 6)}...${displayValue.slice(-4)}` : displayValue;

  return (
    <div className="flex flex-col gap-2 py-3 px-4 glass-card w-full group relative">
      <span className="text-[#2D2D2D]/70 font-medium text-xs">{name}</span>
      <span className="font-mono text-sm font-bold text-[#2D2D2D] bg-[#E8E8E8] px-3 py-1.5 text-center cursor-help">
        {truncatedValue}
      </span>

      {/* Tooltip on hover */}
      {shouldTruncate && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-[#2D2D2D] text-[#F4F4F4] text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 max-w-xs break-all">
          <div className="font-mono">{displayValue}</div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-[#2D2D2D]"></div>
        </div>
      )}
    </div>
  );
}

function printBooleanProperty(name: string, value: boolean) {
  return (
    <div className="flex flex-col gap-2 py-3 px-4 glass-card w-full">
      <span className="text-[#2D2D2D]/70 font-medium text-xs">{name}</span>
      <span
        className={`font-mono text-sm font-bold px-3 py-1.5 text-center ${
          value ? "text-[#F4F4F4] bg-[#A38025]" : "text-[#F4F4F4] bg-[#2D2D2D]"
        }`}
      >
        {value ? "✓ true" : "✗ false"}
      </span>
    </div>
  );
}
