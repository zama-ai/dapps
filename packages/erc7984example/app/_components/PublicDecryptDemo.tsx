"use client";

import { useState, useMemo } from "react";
import { usePublicDecrypt, useFhevmStatus, useEthersSigner } from "fhevm-sdk";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { notification } from "~~/utils/helper/notification";
import deployedContracts from "~~/contracts/deployedContracts";

// ABI for PublicDecryptSingleValue contract
const PUBLIC_DECRYPT_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [{ internalType: "uint32", name: "value", type: "uint32" }], name: "initializeUint32", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "requestDecryptSingleUint32", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "getHandle", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes32[]", name: "handlesList", type: "bytes32[]" }, { internalType: "bytes", name: "cleartexts", type: "bytes" }, { internalType: "bytes", name: "decryptionProof", type: "bytes" }], name: "callbackDecryptSingleUint32", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "clearUint32", outputs: [{ internalType: "uint32", name: "", type: "uint32" }], stateMutability: "view", type: "function" },
] as const;

/**
 * PublicDecryptDemo - Demonstrates the usePublicDecrypt hook
 *
 * Flow:
 * 1. Initialize: Store an encrypted value (input + 1)
 * 2. Request Decrypt: Mark the value as publicly decryptable
 * 3. Client Decrypt: Use usePublicDecrypt to get the decrypted value
 * 4. Submit Callback: Send the proof to the contract for on-chain verification
 */
export const PublicDecryptDemo = () => {
  const { chain } = useAccount();
  const chainId = chain?.id;

  // Get contract address from deployed contracts (if available)
  const contractAddress = useMemo(() => {
    if (!chainId) return undefined;
    const chainContracts = (deployedContracts as any)[chainId];
    return chainContracts?.PublicDecryptSingleValue?.address as `0x${string}` | undefined;
  }, [chainId]);

  // FHEVM status and signer
  const { isReady: fhevmReady } = useFhevmStatus();
  const { signer } = useEthersSigner();

  // Local state
  const [inputValue, setInputValue] = useState<string>("42");
  const [step, setStep] = useState<number>(0);

  // Read contract state
  const { data: handle, refetch: refetchHandle } = useReadContract({
    address: contractAddress,
    abi: PUBLIC_DECRYPT_ABI,
    functionName: "getHandle",
    query: { enabled: !!contractAddress },
  });

  const { data: clearValueOnChain, refetch: refetchClearValue } = useReadContract({
    address: contractAddress,
    abi: PUBLIC_DECRYPT_ABI,
    functionName: "clearUint32",
    query: { enabled: !!contractAddress },
  });

  // Write contract
  const { writeContract, data: txHash, isPending: isWritePending } = useWriteContract();
  const { isLoading: isTxConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  // Public decrypt hook
  const handleStr = handle ? (handle as string) : undefined;
  const {
    decrypt,
    decryptAsync,
    result: decryptResult,
    clearValues,
    canDecrypt,
    isDecrypting,
    error: decryptError,
  } = usePublicDecrypt({
    handles: handleStr ? [handleStr] : undefined,
  });

  // Get client-side decrypted value
  const clientDecryptedValue = handleStr ? clearValues[handleStr] : undefined;

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────

  const handleInitialize = async () => {
    if (!contractAddress || !signer) {
      notification.error("Contract or signer not ready");
      return;
    }

    const value = parseInt(inputValue, 10);
    if (isNaN(value) || value < 0 || value > 4294967295) {
      notification.error("Please enter a valid uint32 value (0 - 4294967295)");
      return;
    }

    try {
      notification.info(`Initializing with value ${value} (will store ${value + 1} encrypted)...`);

      writeContract({
        address: contractAddress,
        abi: PUBLIC_DECRYPT_ABI,
        functionName: "initializeUint32",
        args: [value],
      }, {
        onSuccess: () => {
          notification.success("Initialize transaction submitted!");
          setStep(1);
          setTimeout(() => refetchHandle(), 2000);
        },
        onError: (err) => {
          notification.error(`Initialize failed: ${err.message}`);
        },
      });
    } catch (err: any) {
      notification.error(`Initialize failed: ${err.message}`);
    }
  };

  const handleRequestDecrypt = async () => {
    if (!contractAddress) {
      notification.error("Contract not ready");
      return;
    }

    try {
      notification.info("Requesting public decryption...");

      writeContract({
        address: contractAddress,
        abi: PUBLIC_DECRYPT_ABI,
        functionName: "requestDecryptSingleUint32",
      }, {
        onSuccess: () => {
          notification.success("Request decrypt transaction submitted!");
          setStep(2);
        },
        onError: (err) => {
          notification.error(`Request decrypt failed: ${err.message}`);
        },
      });
    } catch (err: any) {
      notification.error(`Request decrypt failed: ${err.message}`);
    }
  };

  const handlePublicDecrypt = async () => {
    if (!canDecrypt) {
      notification.error("Cannot decrypt - check FHEVM status and handle");
      return;
    }

    try {
      notification.info("Decrypting via relayer...");
      const result = await decryptAsync();

      if (result) {
        notification.success("Decryption successful!");
        setStep(3);
      } else {
        notification.error("Decryption returned no result");
      }
    } catch (err: any) {
      notification.error(`Decryption failed: ${err.message}`);
    }
  };

  const handleSubmitCallback = async () => {
    if (!contractAddress || !decryptResult || !handleStr) {
      notification.error("No decrypt result to submit");
      return;
    }

    try {
      notification.info("Submitting callback with proof...");

      writeContract({
        address: contractAddress,
        abi: PUBLIC_DECRYPT_ABI,
        functionName: "callbackDecryptSingleUint32",
        args: [
          [handleStr as `0x${string}`], // bytes32[] handlesList
          decryptResult.abiEncodedClearValues, // bytes cleartexts
          decryptResult.decryptionProof, // bytes decryptionProof
        ],
      }, {
        onSuccess: () => {
          notification.success("Callback submitted! Value stored on-chain.");
          setStep(4);
          setTimeout(() => refetchClearValue(), 2000);
        },
        onError: (err) => {
          notification.error(`Callback failed: ${err.message}`);
        },
      });
    } catch (err: any) {
      notification.error(`Callback failed: ${err.message}`);
    }
  };

  const handleReset = () => {
    setStep(0);
    setInputValue("42");
    refetchHandle();
    refetchClearValue();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const isLoading = isWritePending || isTxConfirming;

  return (
    <div className="p-6 border rounded-lg bg-base-200 space-y-6 w-full max-w-2xl">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Public Decrypt Demo</h2>
        <button className="btn btn-sm btn-ghost" onClick={handleReset}>
          Reset
        </button>
      </div>

      {/* Contract Info */}
      <div className="text-sm space-y-1">
        <p>
          <span className="opacity-70">Contract:</span>{" "}
          <span className="font-mono">
            {contractAddress ? `${contractAddress.slice(0, 10)}...` : "Not deployed"}
          </span>
        </p>
        <p>
          <span className="opacity-70">FHEVM:</span>{" "}
          <span className={fhevmReady ? "text-success" : "text-warning"}>
            {fhevmReady ? "Ready" : "Not ready"}
          </span>
        </p>
      </div>

      {/* Current State */}
      <div className="p-4 bg-base-300 rounded-lg space-y-2">
        <h3 className="font-semibold">Current State</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="opacity-70">Handle:</span>
            <p className="font-mono text-xs break-all">
              {handleStr ? `${handleStr.slice(0, 20)}...` : "None"}
            </p>
          </div>
          <div>
            <span className="opacity-70">On-chain Clear Value:</span>
            <p className="font-mono">{clearValueOnChain?.toString() ?? "Not set"}</p>
          </div>
          <div>
            <span className="opacity-70">Client Decrypted:</span>
            <p className="font-mono text-success">
              {clientDecryptedValue !== undefined ? clientDecryptedValue.toString() : "Not decrypted"}
            </p>
          </div>
          <div>
            <span className="opacity-70">Current Step:</span>
            <p className="font-mono">{step}/4</p>
          </div>
        </div>
      </div>

      {/* Step 1: Initialize */}
      <div className={`p-4 border rounded-lg ${step >= 1 ? "border-success/50 bg-success/5" : "border-base-300"}`}>
        <h3 className="font-semibold mb-2">Step 1: Initialize Encrypted Value</h3>
        <p className="text-sm opacity-70 mb-3">
          Enter a value to encrypt. The contract will add 1 to it.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            className="input input-bordered flex-1"
            placeholder="Enter uint32 value"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={step >= 1}
          />
          <button
            className="btn btn-primary"
            onClick={handleInitialize}
            disabled={!contractAddress || !signer || isLoading || step >= 1}
          >
            {isLoading && step === 0 ? "Initializing..." : "Initialize"}
          </button>
        </div>
      </div>

      {/* Step 2: Request Decrypt */}
      <div className={`p-4 border rounded-lg ${step >= 2 ? "border-success/50 bg-success/5" : "border-base-300"}`}>
        <h3 className="font-semibold mb-2">Step 2: Request Public Decryption</h3>
        <p className="text-sm opacity-70 mb-3">
          Mark the encrypted value as publicly decryptable on-chain.
        </p>
        <button
          className="btn btn-primary"
          onClick={handleRequestDecrypt}
          disabled={!contractAddress || !handleStr || isLoading || step < 1 || step >= 2}
        >
          {isLoading && step === 1 ? "Requesting..." : "Request Decrypt"}
        </button>
      </div>

      {/* Step 3: Public Decrypt */}
      <div className={`p-4 border rounded-lg ${step >= 3 ? "border-success/50 bg-success/5" : "border-base-300"}`}>
        <h3 className="font-semibold mb-2">Step 3: Client-Side Decryption</h3>
        <p className="text-sm opacity-70 mb-3">
          Use the relayer to decrypt the value client-side.
        </p>
        <button
          className="btn btn-primary"
          onClick={handlePublicDecrypt}
          disabled={!canDecrypt || isDecrypting || step < 2 || step >= 3}
        >
          {isDecrypting ? "Decrypting..." : "Decrypt"}
        </button>
        {decryptError && <p className="text-error text-sm mt-2">{decryptError}</p>}
        {clientDecryptedValue !== undefined && (
          <p className="text-success mt-2">
            Decrypted value: <span className="font-mono font-bold">{clientDecryptedValue.toString()}</span>
          </p>
        )}
      </div>

      {/* Step 4: Submit Callback */}
      <div className={`p-4 border rounded-lg ${step >= 4 ? "border-success/50 bg-success/5" : "border-base-300"}`}>
        <h3 className="font-semibold mb-2">Step 4: Submit Proof to Contract</h3>
        <p className="text-sm opacity-70 mb-3">
          Send the decryption proof to the contract for on-chain verification.
        </p>
        <button
          className="btn btn-primary"
          onClick={handleSubmitCallback}
          disabled={!decryptResult || isLoading || step < 3 || step >= 4}
        >
          {isLoading && step === 3 ? "Submitting..." : "Submit Callback"}
        </button>
        {step >= 4 && (
          <p className="text-success mt-2">
            On-chain value: <span className="font-mono font-bold">{clearValueOnChain?.toString()}</span>
          </p>
        )}
      </div>

      {/* Completion */}
      {step >= 4 && (
        <div className="p-4 bg-success/20 border border-success rounded-lg">
          <h3 className="font-semibold text-success">Complete!</h3>
          <p className="text-sm">
            Input: {inputValue} → Encrypted: {parseInt(inputValue) + 1} → Decrypted: {clearValueOnChain?.toString()}
          </p>
        </div>
      )}
    </div>
  );
};
