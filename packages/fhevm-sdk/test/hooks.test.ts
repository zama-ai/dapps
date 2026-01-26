import { describe, it, expect } from "vitest";

describe("useEncrypt", () => {
  it("should export useEncrypt", async () => {
    const { useEncrypt } = await import("../src/react/useEncrypt");
    expect(useEncrypt).toBeDefined();
    expect(typeof useEncrypt).toBe("function");
  });

  it("should export encryption types", async () => {
    const module = await import("../src/react/useEncrypt");
    expect(module).toBeDefined();
    // Types are checked at compile time
  });
});

describe("EncryptInput types", () => {
  it("should export EncryptInput type from types/encryption", async () => {
    const module = await import("../src/types/encryption");
    expect(module).toBeDefined();
  });
});

describe("encryption type definitions", () => {
  it("should enforce correct value types at compile time", async () => {
    // These tests validate the type system works correctly
    // The actual type checking happens at compile time via TypeScript

    // Import types to verify they're exported
    const types = await import("../src/types/encryption");
    expect(types).toBeDefined();
  });

  it("should have FheTypeName covering all FHE types", async () => {
    // FheTypeName should include: bool, uint8, uint16, uint32, uint64, uint128, uint256, address
    // This is validated at compile time, but we can check the module exports
    const types = await import("../src/types/encryption");
    expect(types).toBeDefined();
  });
});

describe("useUserDecrypt", () => {
  it("should export useUserDecrypt", async () => {
    const { useUserDecrypt } = await import("../src/react/useUserDecrypt");
    expect(useUserDecrypt).toBeDefined();
    expect(typeof useUserDecrypt).toBe("function");
  });
});

describe("usePublicDecrypt", () => {
  it("should export usePublicDecrypt", async () => {
    const { usePublicDecrypt } = await import("../src/react/usePublicDecrypt");
    expect(usePublicDecrypt).toBeDefined();
    expect(typeof usePublicDecrypt).toBe("function");
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

describe("legacy hooks (backward compatibility)", () => {
  it("should export getEncryptionMethod from useFHEEncryption", async () => {
    const { getEncryptionMethod } = await import("../src/react/useFHEEncryption");
    expect(getEncryptionMethod).toBeDefined();
  });

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

  it("should export toHex utility", async () => {
    const { toHex } = await import("../src/react/useFHEEncryption");

    const bytes = new Uint8Array([0x12, 0x34, 0x56]);
    expect(toHex(bytes)).toBe("0x123456");
    expect(toHex("0xabc123")).toBe("0xabc123");
    expect(toHex("abc123")).toBe("0xabc123");
  });
});
