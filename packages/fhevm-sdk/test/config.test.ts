import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createFhevmConfig,
  createStorage,
  createMemoryStorage,
  noopStorage,
} from "../src/config";
import { hardhatLocal, sepolia, defineMockChain } from "../src/chains";

describe("createFhevmConfig", () => {
  it("should create a config with provided chains", () => {
    const config = createFhevmConfig({
      chains: [hardhatLocal, sepolia],
    });

    expect(config.chains).toHaveLength(2);
    expect(config.chains[0]).toBe(hardhatLocal);
    expect(config.chains[1]).toBe(sepolia);
  });

  it("should throw if no chains provided", () => {
    expect(() =>
      createFhevmConfig({
        chains: [],
      })
    ).toThrow("At least one chain must be provided");
  });

  it("should allow getting chain by ID", () => {
    const config = createFhevmConfig({
      chains: [hardhatLocal, sepolia],
    });

    expect(config.getChain(31337)).toBe(hardhatLocal);
    expect(config.getChain(11155111)).toBe(sepolia);
    expect(config.getChain(99999)).toBeUndefined();
  });

  it("should correctly identify mock chains", () => {
    const config = createFhevmConfig({
      chains: [hardhatLocal, sepolia],
    });

    expect(config.isMockChain(31337)).toBe(true);
    expect(config.isMockChain(11155111)).toBe(false);
    expect(config.isMockChain(99999)).toBe(false);
  });

  it("should return RPC URL for mock chains", () => {
    const config = createFhevmConfig({
      chains: [hardhatLocal, sepolia],
    });

    expect(config.getMockRpcUrl(31337)).toBe("http://localhost:8545");
    expect(config.getMockRpcUrl(11155111)).toBeUndefined();
  });

  it("should warn on duplicate chain IDs", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const customHardhat = defineMockChain({
      id: 31337,
      name: "Custom Hardhat",
      network: "hardhat",
      rpcUrl: "http://localhost:9999",
    });

    const config = createFhevmConfig({
      chains: [hardhatLocal, customHardhat],
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Duplicate chain ID 31337")
    );

    // Should use first definition
    expect(config.getChain(31337)?.rpcUrl).toBe("http://localhost:8545");

    warnSpy.mockRestore();
  });

  it("should set ssr flag", () => {
    const config = createFhevmConfig({
      chains: [hardhatLocal],
      ssr: true,
    });

    expect(config.ssr).toBe(true);
  });

  it("should use noopStorage in SSR mode", () => {
    const config = createFhevmConfig({
      chains: [hardhatLocal],
      ssr: true,
    });

    expect(config.storage).toBe(noopStorage);
  });

  it("should use custom storage when provided", () => {
    const customStorage = createMemoryStorage();

    const config = createFhevmConfig({
      chains: [hardhatLocal],
      storage: customStorage,
    });

    expect(config.storage).toBe(customStorage);
  });
});

describe("storage", () => {
  describe("noopStorage", () => {
    it("should return null for getItem", () => {
      expect(noopStorage.getItem("key")).toBeNull();
    });

    it("should not throw on setItem", () => {
      expect(() => noopStorage.setItem("key", "value")).not.toThrow();
    });

    it("should not throw on removeItem", () => {
      expect(() => noopStorage.removeItem("key")).not.toThrow();
    });
  });

  describe("createMemoryStorage", () => {
    it("should store and retrieve values", () => {
      const storage = createMemoryStorage();

      storage.setItem("key", "value");
      expect(storage.getItem("key")).toBe("value");
    });

    it("should return null for missing keys", () => {
      const storage = createMemoryStorage();
      expect(storage.getItem("missing")).toBeNull();
    });

    it("should remove values", () => {
      const storage = createMemoryStorage();

      storage.setItem("key", "value");
      storage.removeItem("key");
      expect(storage.getItem("key")).toBeNull();
    });
  });

  describe("createStorage", () => {
    let mockStorage: Storage;

    beforeEach(() => {
      mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      };
    });

    it("should prefix keys with fhevm by default", () => {
      const storage = createStorage({ storage: mockStorage });

      storage.setItem("test", "value");
      expect(mockStorage.setItem).toHaveBeenCalledWith("fhevm.test", "value");

      storage.getItem("test");
      expect(mockStorage.getItem).toHaveBeenCalledWith("fhevm.test");

      storage.removeItem("test");
      expect(mockStorage.removeItem).toHaveBeenCalledWith("fhevm.test");
    });

    it("should use custom key prefix", () => {
      const storage = createStorage({ storage: mockStorage, key: "custom" });

      storage.setItem("test", "value");
      expect(mockStorage.setItem).toHaveBeenCalledWith("custom.test", "value");
    });

    it("should return noopStorage when storage is undefined", () => {
      const storage = createStorage({ storage: undefined });
      expect(storage.getItem("key")).toBeNull();
    });
  });
});
