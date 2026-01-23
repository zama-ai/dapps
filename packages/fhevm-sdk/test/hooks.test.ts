import { describe, it, expect } from "vitest";

describe("useEncrypt", () => {
  it("should export useEncrypt", async () => {
    const { useEncrypt } = await import("../src/react/useEncrypt");
    expect(useEncrypt).toBeDefined();
    expect(typeof useEncrypt).toBe("function");
  });

  it("should export EncryptedInput type", async () => {
    // Type imports are checked at compile time, but we can verify the module exports
    const module = await import("../src/react/useEncrypt");
    expect(module).toBeDefined();
  });

  it("should re-export utility functions", async () => {
    const { getEncryptionMethod, toHex, buildParamsFromAbi } = await import(
      "../src/react/useEncrypt"
    );
    expect(getEncryptionMethod).toBeDefined();
    expect(toHex).toBeDefined();
    expect(buildParamsFromAbi).toBeDefined();
  });

  describe("getEncryptionMethod", () => {
    it("should map external types to builder methods", async () => {
      const { getEncryptionMethod } = await import("../src/react/useFHEEncryption");

      expect(getEncryptionMethod("externalEbool")).toBe("addBool");
      expect(getEncryptionMethod("externalEuint8")).toBe("add8");
      expect(getEncryptionMethod("externalEuint16")).toBe("add16");
      expect(getEncryptionMethod("externalEuint32")).toBe("add32");
      expect(getEncryptionMethod("externalEuint64")).toBe("add64");
      expect(getEncryptionMethod("externalEuint128")).toBe("add128");
      expect(getEncryptionMethod("externalEuint256")).toBe("add256");
      expect(getEncryptionMethod("externalEaddress")).toBe("addAddress");
    });

    it("should default to add64 for unknown types", async () => {
      const { getEncryptionMethod } = await import("../src/react/useFHEEncryption");
      expect(getEncryptionMethod("unknown")).toBe("add64");
    });
  });

  describe("toHex", () => {
    it("should convert Uint8Array to hex", async () => {
      const { toHex } = await import("../src/react/useFHEEncryption");
      const bytes = new Uint8Array([0x12, 0x34, 0x56]);
      expect(toHex(bytes)).toBe("0x123456");
    });

    it("should handle string with 0x prefix", async () => {
      const { toHex } = await import("../src/react/useFHEEncryption");
      expect(toHex("0xabc123")).toBe("0xabc123");
    });

    it("should add 0x prefix to string without it", async () => {
      const { toHex } = await import("../src/react/useFHEEncryption");
      expect(toHex("abc123")).toBe("0xabc123");
    });
  });
});

describe("useUserDecrypt", () => {
  it("should export useUserDecrypt", async () => {
    const { useUserDecrypt } = await import("../src/react/useUserDecrypt");
    expect(useUserDecrypt).toBeDefined();
    expect(typeof useUserDecrypt).toBe("function");
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
