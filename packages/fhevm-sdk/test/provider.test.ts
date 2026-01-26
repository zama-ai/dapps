import { describe, it, expect } from "vitest";
import { createFhevmConfig } from "../src/config";
import { hardhatLocal, sepolia } from "../src/chains";

// Note: Full React rendering tests would require @testing-library/react
// For now, we test the exports and basic configuration

describe("FhevmProvider", () => {
  describe("exports", () => {
    it("should export FhevmProvider", async () => {
      const { FhevmProvider } = await import("../src/react/FhevmProvider");
      expect(FhevmProvider).toBeDefined();
      expect(typeof FhevmProvider).toBe("function");
    });

    it("should export FhevmContext and useFhevmContext", async () => {
      const { FhevmContext, useFhevmContext } = await import(
        "../src/react/context"
      );
      expect(FhevmContext).toBeDefined();
      expect(useFhevmContext).toBeDefined();
    });
  });

  describe("useFhevmContext", () => {
    it("should be defined", async () => {
      const { useFhevmContext } = await import("../src/react/context");
      expect(useFhevmContext).toBeDefined();
      expect(typeof useFhevmContext).toBe("function");
    });
  });
});

describe("useFhevmStatus", () => {
  it("should export useFhevmStatus", async () => {
    const { useFhevmStatus } = await import("../src/react/useFhevmStatus");
    expect(useFhevmStatus).toBeDefined();
    expect(typeof useFhevmStatus).toBe("function");
  });
});

describe("useFhevmClient", () => {
  it("should export useFhevmClient", async () => {
    const { useFhevmClient } = await import("../src/react/useFhevmClient");
    expect(useFhevmClient).toBeDefined();
    expect(typeof useFhevmClient).toBe("function");
  });
});

describe("config integration", () => {
  it("should create a valid config for provider", () => {
    const config = createFhevmConfig({
      chains: [hardhatLocal, sepolia],
    });

    expect(config.chains).toHaveLength(2);
    expect(config.getChain(31337)).toBe(hardhatLocal);
    expect(config.getChain(11155111)).toBe(sepolia);
  });
});
