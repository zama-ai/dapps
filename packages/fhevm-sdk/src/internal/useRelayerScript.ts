"use client";

import { useState, useEffect } from "react";
import { RELAYER_SDK_URL } from "./constants";

/**
 * Script loading status.
 */
export type ScriptStatus = "idle" | "loading" | "ready" | "error";

/**
 * Return type for useRelayerScript hook.
 */
export interface UseRelayerScriptReturn {
  /** Current loading status */
  status: ScriptStatus;
  /** Error if script failed to load */
  error: Error | undefined;
  /** Whether script is ready */
  isReady: boolean;
  /** Whether script is currently loading */
  isLoading: boolean;
  /** Whether script failed to load */
  isError: boolean;
}

/**
 * Hook that automatically loads the relayer SDK script.
 *
 * Handles:
 * - Dynamic script injection on first mount
 * - Deduplication (won't load twice if multiple providers exist)
 * - Error states if script fails to load
 * - SSR safety (only loads on client)
 *
 * @internal
 */
export function useRelayerScript(): UseRelayerScriptReturn {
  const [status, setStatus] = useState<ScriptStatus>("idle");
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    // Skip on server
    if (typeof window === "undefined") {
      return;
    }

    // Already loaded (e.g., user manually added script or previous provider loaded it)
    if ((window as any).relayerSDK) {
      setStatus("ready");
      return;
    }

    // Check if script tag already exists (another provider instance may have added it)
    const existingScript = document.querySelector(
      `script[src="${RELAYER_SDK_URL}"]`
    ) as HTMLScriptElement | null;

    if (existingScript) {
      // Script tag exists, wait for it to load
      const handleLoad = () => {
        setStatus("ready");
      };

      const handleError = () => {
        setStatus("error");
        setError(new Error("Failed to load relayer SDK script"));
      };

      // Check if already loaded (script might have loaded between render and effect)
      if ((window as any).relayerSDK) {
        setStatus("ready");
        return;
      }

      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);

      // Set loading state
      setStatus("loading");

      return () => {
        existingScript.removeEventListener("load", handleLoad);
        existingScript.removeEventListener("error", handleError);
      };
    }

    // No existing script, load it
    setStatus("loading");

    const script = document.createElement("script");
    script.src = RELAYER_SDK_URL;
    script.async = false; // Ensure sequential loading

    script.onload = () => {
      setStatus("ready");
    };

    script.onerror = () => {
      setStatus("error");
      setError(
        new Error(`Failed to load relayer SDK from ${RELAYER_SDK_URL}`)
      );
    };

    document.head.appendChild(script);

    // No cleanup - we don't remove the script once added
  }, []);

  return {
    status,
    error,
    isReady: status === "ready",
    isLoading: status === "loading",
    isError: status === "error",
  };
}
