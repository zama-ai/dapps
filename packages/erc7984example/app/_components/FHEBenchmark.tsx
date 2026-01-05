"use client";

import { useState } from "react";
import { FhevmInstance } from "fhevm-sdk";
import { useDeployedContractInfo } from "~~/hooks/helper";
import { useWagmiEthers } from "~~/hooks/wagmi/useWagmiEthers";
import { useAccount } from "wagmi";
import type { AllowedChainIds } from "~~/utils/helper/networks";

type BenchmarkResult = {
  operation: string;
  duration: number;
  timestamp: string;
};

type FHEBenchmarkProps = {
  instance: FhevmInstance | undefined;
  fhevmStatus: string;
};

export const FHEBenchmark = ({ instance, fhevmStatus }: FHEBenchmarkProps) => {
  const { chain } = useAccount();
  const chainId = chain?.id;

  const initialMockChains = { 31337: "http://localhost:8545" };

  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [threadInfo, setThreadInfo] = useState<string>("Click 'Check Threading' to analyze");

  // Get ethers signer and contract info
  const { ethersSigner } = useWagmiEthers(initialMockChains);
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: erc7984 } = useDeployedContractInfo({ contractName: "ERC7984Example", chainId: allowedChainId });

  const addResult = (operation: string, duration: number) => {
    setResults((prev) => [
      ...prev,
      {
        operation,
        duration,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const checkThreading = () => {
    try {
      const info: string[] = [];

      // Check for crossOriginIsolated (required for SharedArrayBuffer/multi-threading)
      info.push(`crossOriginIsolated: ${window.crossOriginIsolated}`);

      // Check for SharedArrayBuffer support
      info.push(`SharedArrayBuffer: ${typeof SharedArrayBuffer !== "undefined"}`);

      // Check navigator.hardwareConcurrency
      info.push(`CPU cores: ${navigator.hardwareConcurrency || "unknown"}`);

      // Check if relayerSDK is loaded
      const w = window as any;
      info.push(`relayerSDK loaded: ${!!w.relayerSDK}`);

      setThreadInfo(info.join(" | "));
    } catch (e) {
      setThreadInfo(`Error: ${e}`);
    }
  };

  const runEncryptionBenchmark = async () => {
    if (!instance || !ethersSigner || !erc7984?.address) {
      alert("Instance, signer, or contract not ready");
      return;
    }

    setIsRunning(true);
    setResults([]); // Clear previous results
    const userAddress = await ethersSigner.getAddress();

    try {
      // Warm-up run
      console.log("[Benchmark] Warm-up encryption...");
      const warmupStart = performance.now();
      const warmupInput = instance.createEncryptedInput(erc7984.address, userAddress);
      (warmupInput as any).add64(BigInt(100));
      await (warmupInput as any).encrypt();
      const warmupEnd = performance.now();
      addResult("Warm-up (euint64)", warmupEnd - warmupStart);

      // Benchmark: Single value encryption (euint64)
      console.log("[Benchmark] Single euint64 encryption...");
      const start1 = performance.now();
      const input1 = instance.createEncryptedInput(erc7984.address, userAddress);
      (input1 as any).add64(BigInt(12345));
      await (input1 as any).encrypt();
      const end1 = performance.now();
      addResult("Encrypt euint64 (single)", end1 - start1);

      // Run 4 more single encryptions for average
      for (let i = 0; i < 4; i++) {
        const startN = performance.now();
        const inputN = instance.createEncryptedInput(erc7984.address, userAddress);
        (inputN as any).add64(BigInt(i * 1000));
        await (inputN as any).encrypt();
        const endN = performance.now();
        addResult(`Encrypt euint64 #${i + 2}`, endN - startN);
      }

      console.log("[Benchmark] Encryption complete!");
    } catch (e) {
      console.error("[Benchmark] Encryption error:", e);
      addResult("Encryption ERROR", -1);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const isReady = instance && ethersSigner && erc7984?.address;
  const validResults = results.filter((r) => r.duration > 0 && !r.operation.includes("Warm-up"));
  const avgDuration = validResults.length > 0
    ? validResults.reduce((a, b) => a + b.duration, 0) / validResults.length
    : 0;

  return (
    <div className="p-4 border rounded-lg bg-base-200 space-y-4 w-full max-w-2xl">
      <h2 className="text-xl font-bold">FHE Performance Benchmark</h2>

      {/* Threading Info */}
      <div className="p-3 bg-base-300 rounded">
        <div className="font-semibold mb-2">Threading Status:</div>
        <div className="text-sm font-mono break-all">{threadInfo}</div>
        <button className="btn btn-sm btn-secondary mt-2" onClick={checkThreading}>
          Check Threading
        </button>
      </div>

      {/* Status */}
      <div className="text-sm space-y-1">
        <div>
          FHEVM Status: <span className="font-mono">{fhevmStatus}</span>
        </div>
        <div>
          Ready:{" "}
          <span className={isReady ? "text-success" : "text-error"}>
            {isReady ? "Yes" : "No"}
          </span>
          {!isReady && " - Connect wallet and wait for FHEVM instance"}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          className="btn btn-primary"
          onClick={runEncryptionBenchmark}
          disabled={!isReady || isRunning}
        >
          {isRunning ? "Running..." : "Run Encryption Benchmark"}
        </button>
        <button className="btn btn-ghost" onClick={clearResults} disabled={results.length === 0}>
          Clear Results
        </button>
      </div>

      {/* Results Table */}
      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Operation</th>
                <th>Duration (ms)</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className={r.operation.includes("Warm-up") ? "opacity-50" : ""}>
                  <td>{r.operation}</td>
                  <td className={r.duration < 0 ? "text-error" : ""}>
                    {r.duration < 0 ? "ERROR" : r.duration.toFixed(2)}
                  </td>
                  <td className="text-xs opacity-70">{r.timestamp.split("T")[1].split(".")[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {validResults.length > 0 && (
        <div className="text-sm text-base-content/70">
          Average (excluding warm-up): <strong>{avgDuration.toFixed(2)} ms</strong> across {validResults.length} runs
        </div>
      )}
    </div>
  );
};
