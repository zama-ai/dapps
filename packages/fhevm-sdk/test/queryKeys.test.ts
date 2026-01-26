import { describe, it, expect } from "vitest";
import { fhevmKeys } from "../src/react/queryKeys";

describe("fhevmKeys", () => {
  describe("all", () => {
    it("should return root key", () => {
      expect(fhevmKeys.all).toEqual(["fhevm"]);
    });
  });

  describe("decrypt", () => {
    it("should return decrypt base key", () => {
      expect(fhevmKeys.decrypt()).toEqual(["fhevm", "decrypt"]);
    });

    it("should return handle-specific key", () => {
      const key = fhevmKeys.decryptHandle(1, "0xhandle", "0xcontract");
      expect(key).toEqual(["fhevm", "decrypt", 1, "0xhandle", "0xcontract"]);
    });

    it("should return batch key with sorted handles", () => {
      const key = fhevmKeys.decryptBatch(1, ["0xb", "0xa", "0xc"]);
      expect(key).toEqual(["fhevm", "decrypt", 1, "batch", "0xa,0xb,0xc"]);
    });
  });

  describe("signature", () => {
    it("should return signature base key", () => {
      expect(fhevmKeys.signature()).toEqual(["fhevm", "signature"]);
    });

    it("should return user-specific key with lowercase address", () => {
      const key = fhevmKeys.signatureFor(1, "0xABCDEF");
      expect(key).toEqual(["fhevm", "signature", 1, "0xabcdef"]);
    });
  });

  describe("encrypt", () => {
    it("should return encrypt base key", () => {
      expect(fhevmKeys.encrypt()).toEqual(["fhevm", "encrypt"]);
    });

    it("should return contract-specific key with lowercase address", () => {
      const key = fhevmKeys.encryptFor(31337, "0xCONTRACT");
      expect(key).toEqual(["fhevm", "encrypt", 31337, "0xcontract"]);
    });
  });

  describe("instance", () => {
    it("should return instance base key", () => {
      expect(fhevmKeys.instance()).toEqual(["fhevm", "instance"]);
    });

    it("should return chain-specific key", () => {
      const key = fhevmKeys.instanceFor(31337);
      expect(key).toEqual(["fhevm", "instance", 31337]);
    });
  });

  describe("key hierarchy", () => {
    it("should allow invalidating all decrypt queries", () => {
      const decryptBase = fhevmKeys.decrypt();
      const handleKey = fhevmKeys.decryptHandle(1, "0xh", "0xc");
      const batchKey = fhevmKeys.decryptBatch(1, ["0xa"]);

      // Handle and batch keys should start with decrypt base
      expect(handleKey.slice(0, decryptBase.length)).toEqual(decryptBase);
      expect(batchKey.slice(0, decryptBase.length)).toEqual(decryptBase);
    });

    it("should allow invalidating all fhevm queries", () => {
      const allKey = fhevmKeys.all;
      const decryptKey = fhevmKeys.decrypt();
      const signatureKey = fhevmKeys.signature();
      const encryptKey = fhevmKeys.encrypt();

      // All keys should start with the root key
      expect(decryptKey.slice(0, allKey.length)).toEqual(allKey);
      expect(signatureKey.slice(0, allKey.length)).toEqual(allKey);
      expect(encryptKey.slice(0, allKey.length)).toEqual(allKey);
    });
  });
});
