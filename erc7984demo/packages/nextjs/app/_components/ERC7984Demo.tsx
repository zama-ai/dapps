"use client";

import { useMemo, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useERC7984Wagmi } from "~~/hooks/erc7984/useERC7984Wagmi";

/*
 * Main ERC7984 React component for interacting with confidential tokens
 *  - "Decrypt" button: allows you to decrypt the current balance handle
 *  - "Transfer" button: allows you to transfer tokens using FHE operations
 */
export const ERC7984Demo = () => {
  const { isConnected, chain } = useAccount();

  const chainId = chain?.id;

  //////////////////////////////////////////////////////////////////////////////
  // FHEVM instance
  //////////////////////////////////////////////////////////////////////////////

  // Create EIP-1193 provider from wagmi for FHEVM
  const provider = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    // Get the wallet provider from window.ethereum
    return (window as any).ethereum;
  }, []);

  const initialMockChains = { 31337: "http://localhost:8545" };

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true, // use enabled to dynamically create the instance on-demand
  });

  //////////////////////////////////////////////////////////////////////////////
  // useERC7984 is a custom hook containing all the ERC7984 logic, including
  // - calling the ERC7984 contract
  // - encrypting FHE inputs
  // - decrypting FHE handles
  //////////////////////////////////////////////////////////////////////////////

  const erc7984 = useERC7984Wagmi({
    instance: fhevmInstance,
    initialMockChains,
  });

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
    "inline-flex items-center justify-center px-6 py-3 font-semibold shadow-lg " +
    "transition-all duration-200 hover:scale-105 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

  // Primary (accent) button — #FFD208 with dark text and warm hover #A38025
  const primaryButtonClass =
    buttonClass +
    " bg-[#FFD208] text-[#2D2D2D] hover:bg-[#A38025] focus-visible:ring-[#2D2D2D]  cursor-pointer";

  // Secondary (neutral dark) button — #2D2D2D with light text and accent focus
  const secondaryButtonClass =
    buttonClass +
    " bg-black text-[#F4F4F4] hover:bg-[#1F1F1F] focus-visible:ring-[#FFD208] cursor-pointer";

  // Success/confirmed state — deeper gold #A38025 with dark text
  const successButtonClass =
    buttonClass +
    " bg-[#A38025] text-[#2D2D2D] hover:bg-[#8F6E1E] focus-visible:ring-[#2D2D2D]";

  const titleClass = "font-bold text-gray-900 text-xl mb-4 border-b-1 border-gray-700 pb-2";
  const sectionClass = "bg-[#f4f4f4] shadow-lg p-6 mb-6 text-gray-900";

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-gray-900">
        <div className="flex items-center justify-center">
          <div className="bg-white bordershadow-xl p-8 text-center">
            <div className="mb-4">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-900/30 text-amber-400 text-3xl">
                ⚠️
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Wallet not connected</h2>
            <p className="text-gray-700 mb-6">Connect your wallet to use the ERC7984 confidential token demo.</p>
            <div className="flex items-center justify-center">
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-gray-900">
      {/* Header */}
      <div className="text-center mb-8 text-black">
        <h1 className="text-3xl font-bold mb-2">ERC7984 Confidential Token Demo</h1>
        <p className="text-gray-600">Interact with the Fully Homomorphic Encryption confidential token contract</p>
      </div>

      {/* Balance Handle Display */}
      <div className={sectionClass}>
        <h3 className={titleClass}>💰 Confidential Balance</h3>
        <div className="space-y-3 space-x-3">
          {printProperty("Encrypted Handle", erc7984.handle || "No handle available")}
          {printProperty("Decrypted Value", erc7984.isDecrypted ? erc7984.clear : "Not decrypted yet")}
          {printProperty("Your Address", erc7984.address || "N/A")}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 gap-4 text-black">
        <button
          className={erc7984.isDecrypted ? successButtonClass : primaryButtonClass}
          disabled={!erc7984.canDecrypt}
          onClick={erc7984.decryptBalanceHandle}
        >
          {erc7984.canDecrypt
            ? "🔓 Decrypt Balance"
            : erc7984.isDecrypted
              ? `✅ Decrypted: ${erc7984.clear}`
              : erc7984.isDecrypting
                ? "⏳ Decrypting..."
                : "❌ Nothing to decrypt"}
        </button>
      </div>

      {/* Transfer Section */}
      <div className={sectionClass}>
        <h3 className={titleClass}>📤 Transfer Confidential Tokens</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="transferTo" className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <input
              id="transferTo"
              type="text"
              placeholder="0x..."
              value={transferTo}
              onChange={e => setTransferTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FFD208] focus:border-[#FFD208]"
            />
          </div>
          <div>
            <label htmlFor="transferAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <input
              id="transferAmount"
              type="number"
              placeholder="1"
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#FFD208] focus:border-[#FFD208]"
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

      {/* Messages */}
      {erc7984.message && (
        <div className={sectionClass}>
          <h3 className={titleClass}>💬 Messages</h3>
          <div className="border bg-white border-gray-200 p-4">
            <p className="text-gray-800">{erc7984.message}</p>
          </div>
        </div>
      )}

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
    <div className="flex justify-between items-center py-2 px-3 bg-white border border-gray-200 w-full">
      <span className="text-gray-800 font-medium">{name}</span>
      <span className="ml-2 font-mono text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 border border-gray-300">
        {displayValue}
      </span>
    </div>
  );
}

function printBooleanProperty(name: string, value: boolean) {
  return (
    <div className="flex justify-between items-center py-2 px-3  bg-white border border-gray-200 w-full">
      <span className="text-gray-700 font-medium">{name}</span>
      <span
        className={`font-mono text-sm font-semibold px-2 py-1 border ${
          value
            ? "text-green-800 bg-green-100 border-green-300"
            : "text-red-800 bg-red-100 border-red-300"
        }`}
      >
        {value ? "✓ true" : "✗ false"}
      </span>
    </div>
  );
}

