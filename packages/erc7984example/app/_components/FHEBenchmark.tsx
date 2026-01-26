"use client";

import { useState } from "react";
import { useFhevmStatus, useEncrypt } from "fhevm-sdk";
import { useAccount } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/helper";
import type { AllowedChainIds } from "~~/utils/helper/networks";

type BenchmarkResult = {
  operation: string;
  duration: number;
  timestamp: string;
};

/**
 * FHE Performance Benchmark Component
 *
 * No props needed - everything is retrieved from FhevmProvider context.
 */
export const FHEBenchmark = () => {
  const { chain } = useAccount();
  const chainId = chain?.id;

  // Get encryption hook and status from context
  const { encrypt, isReady: encryptReady } = useEncrypt();
  const { status: fhevmStatus } = useFhevmStatus();

  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [threadInfo, setThreadInfo] = useState<string>("Click 'Check Threading' to analyze");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Get contract info
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: erc7984 } = useDeployedContractInfo({ contractName: "ERC7984Example", chainId: allowedChainId });

  const addResult = (operation: string, duration: number) => {
    setResults(prev => [
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

  const waitWithCountdown = async (seconds: number, message: string) => {
    for (let i = seconds; i > 0; i--) {
      setStatusMessage(`${message} (${i}s remaining)`);
      await delay(1000);
    }
    setStatusMessage("");
  };

  const runEncryptionBenchmark = async () => {
    if (!encryptReady || !erc7984?.address) {
      alert("Encryption not ready or contract not found");
      return;
    }

    setIsRunning(true);
    setResults([]); // Clear previous results
    const totalRuns = 3; // Reduced to 3 runs to minimize rate limit risk

    try {
      // Warm-up run
      setStatusMessage("Running warm-up encryption...");
      console.log("[Benchmark] Warm-up encryption...");
      const warmupStart = performance.now();
      await encrypt([
        { type: "uint64", value: BigInt(100) },
      ], erc7984.address as `0x${string}`);
      const warmupEnd = performance.now();
      addResult("Warm-up (euint64)", warmupEnd - warmupStart);

      // Wait before next request
      await waitWithCountdown(10, "Rate limit cooldown");

      // Run benchmark encryptions with delays
      for (let i = 0; i < totalRuns; i++) {
        setStatusMessage(`Running encryption #${i + 1}...`);
        console.log(`[Benchmark] Encryption #${i + 1}...`);
        const startN = performance.now();
        await encrypt([
          { type: "uint64", value: BigInt(i * 1000 + 12345) },
        ], erc7984.address as `0x${string}`);
        const endN = performance.now();
        addResult(`Encrypt euint64 #${i + 1}`, endN - startN);

        // Wait between requests (except after the last one)
        if (i < totalRuns - 1) {
          await waitWithCountdown(10, "Rate limit cooldown");
        }
      }

      setStatusMessage("Benchmark complete!");
      console.log("[Benchmark] Encryption complete!");
      await delay(2000);
      setStatusMessage("");
    } catch (e) {
      console.error("[Benchmark] Encryption error:", e);
      addResult("Encryption ERROR", -1);
      setStatusMessage("Error occurred during benchmark");
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const isReady = encryptReady && erc7984?.address;
  const validResults = results.filter(r => r.duration > 0 && !r.operation.includes("Warm-up"));
  const avgDuration =
    validResults.length > 0 ? validResults.reduce((a, b) => a + b.duration, 0) / validResults.length : 0;

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
          Ready: <span className={isReady ? "text-success" : "text-error"}>{isReady ? "Yes" : "No"}</span>
          {!isReady && " - Connect wallet and wait for FHEVM instance"}
        </div>
      </div>

      {/* Rate Limit Warning */}
      <div className="p-3 bg-warning/20 border border-warning rounded text-sm">
        <span className="font-semibold">Rate Limit Warning:</span> The FHE encryption service has strict rate limits.
        More than 5 requests in 10 seconds will result in a 1-hour ban. This benchmark includes 10-second delays between
        operations to stay safe.
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button className="btn btn-primary" onClick={runEncryptionBenchmark} disabled={!isReady || isRunning}>
          {isRunning ? "Running..." : "Run Encryption Benchmark"}
        </button>
        <button className="btn btn-ghost" onClick={clearResults} disabled={results.length === 0}>
          Clear Results
        </button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className="p-3 bg-info/20 border border-info rounded text-sm font-mono">{statusMessage}</div>
      )}

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
