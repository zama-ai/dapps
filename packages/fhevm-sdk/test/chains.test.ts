import { describe, it, expect } from "vitest";
import {
  hardhatLocal,
  sepolia,
  createHardhatChain,
  defineChain,
  defineMockChain,
  defineProductionChain,
  isMockChain,
  isProductionChain,
  SEPOLIA_CHAIN_ID,
} from "../src/chains";

describe("chains", () => {
  describe("hardhatLocal", () => {
    it("should have correct chain id", () => {
      expect(hardhatLocal.id).toBe(31337);
    });

    it("should be marked as mock chain", () => {
      expect(hardhatLocal.isMock).toBe(true);
    });

    it("should have localhost RPC URL", () => {
      expect(hardhatLocal.rpcUrl).toBe("http://localhost:8545");
    });

    it("should pass isMockChain type guard", () => {
      expect(isMockChain(hardhatLocal)).toBe(true);
      expect(isProductionChain(hardhatLocal)).toBe(false);
    });
  });

  describe("sepolia", () => {
    it("should have correct chain id", () => {
      expect(sepolia.id).toBe(11155111);
      expect(sepolia.id).toBe(SEPOLIA_CHAIN_ID);
    });

    it("should not be marked as mock chain", () => {
      expect(sepolia.isMock).toBe(false);
    });

    it("should pass isProductionChain type guard", () => {
      expect(isProductionChain(sepolia)).toBe(true);
      expect(isMockChain(sepolia)).toBe(false);
    });
  });

  describe("createHardhatChain", () => {
    it("should create a custom hardhat chain with different RPC", () => {
      const customChain = createHardhatChain({
        rpcUrl: "http://192.168.1.100:8545",
      });

      expect(customChain.id).toBe(31337);
      expect(customChain.rpcUrl).toBe("http://192.168.1.100:8545");
      expect(customChain.isMock).toBe(true);
    });

    it("should allow custom chain id", () => {
      const customChain = createHardhatChain({
        rpcUrl: "http://localhost:8546",
        id: 31338,
        name: "Hardhat 2",
      });

      expect(customChain.id).toBe(31338);
      expect(customChain.name).toBe("Hardhat 2");
    });
  });

  describe("defineChain", () => {
    it("should return the chain as-is", () => {
      const chain = defineChain({
        id: 99999,
        name: "Test Chain",
        network: "test",
        isMock: true,
        rpcUrl: "http://localhost:9999",
      });

      expect(chain.id).toBe(99999);
      expect(chain.name).toBe("Test Chain");
    });
  });

  describe("defineMockChain", () => {
    it("should set isMock to true", () => {
      const chain = defineMockChain({
        id: 12345,
        name: "Mock Chain",
        network: "mock",
        rpcUrl: "http://localhost:1234",
      });

      expect(chain.isMock).toBe(true);
    });
  });

  describe("defineProductionChain", () => {
    it("should set isMock to false", () => {
      const chain = defineProductionChain({
        id: 54321,
        name: "Prod Chain",
        network: "prod",
        aclAddress: "0x1234567890123456789012345678901234567890",
        gatewayUrl: "https://gateway.example.com",
        kmsVerifierAddress: "0x2345678901234567890123456789012345678901",
        inputVerifierAddress: "0x3456789012345678901234567890123456789012",
        relayerUrl: "https://relayer.example.com",
      });

      expect(chain.isMock).toBe(false);
      expect(isProductionChain(chain)).toBe(true);
    });
  });
});
