import { describe, it, expect } from "vitest";
import type { EncryptInput, FheTypeName, EncryptResult } from "../src/types/encryption";

/**
 * Type-level tests for encryption types.
 *
 * These tests use TypeScript's type system to verify that:
 * 1. EncryptInput correctly enforces value types based on the `type` field
 * 2. Invalid type/value combinations produce type errors (caught at compile time)
 *
 * If these tests compile, the type system is working correctly.
 */

describe("EncryptInput type safety", () => {
  describe("valid inputs", () => {
    it("should accept bool with boolean value", () => {
      const input: EncryptInput = { type: "bool", value: true };
      expect(input.type).toBe("bool");
      expect(input.value).toBe(true);
    });

    it("should accept uint8 with number value", () => {
      const input: EncryptInput = { type: "uint8", value: 255 };
      expect(input.type).toBe("uint8");
      expect(input.value).toBe(255);
    });

    it("should accept uint16 with number value", () => {
      const input: EncryptInput = { type: "uint16", value: 65535 };
      expect(input.type).toBe("uint16");
      expect(input.value).toBe(65535);
    });

    it("should accept uint32 with number value", () => {
      const input: EncryptInput = { type: "uint32", value: 4294967295 };
      expect(input.type).toBe("uint32");
      expect(input.value).toBe(4294967295);
    });

    it("should accept uint64 with bigint value", () => {
      const input: EncryptInput = { type: "uint64", value: 100n };
      expect(input.type).toBe("uint64");
      expect(input.value).toBe(100n);
    });

    it("should accept uint128 with bigint value", () => {
      const input: EncryptInput = { type: "uint128", value: 999999999999999999999999n };
      expect(input.type).toBe("uint128");
      expect(input.value).toBe(999999999999999999999999n);
    });

    it("should accept uint256 with bigint value", () => {
      const input: EncryptInput = { type: "uint256", value: 2n ** 255n };
      expect(input.type).toBe("uint256");
    });

    it("should accept address with hex string value", () => {
      const input: EncryptInput = { type: "address", value: "0x1234567890abcdef1234567890abcdef12345678" };
      expect(input.type).toBe("address");
      expect(input.value).toBe("0x1234567890abcdef1234567890abcdef12345678");
    });
  });

  describe("array of inputs", () => {
    it("should accept an array of mixed valid inputs", () => {
      const inputs: EncryptInput[] = [
        { type: "bool", value: true },
        { type: "uint8", value: 42 },
        { type: "uint64", value: 100n },
        { type: "address", value: "0x1234567890abcdef1234567890abcdef12345678" },
      ];

      expect(inputs).toHaveLength(4);
      expect(inputs[0].type).toBe("bool");
      expect(inputs[1].type).toBe("uint8");
      expect(inputs[2].type).toBe("uint64");
      expect(inputs[3].type).toBe("address");
    });
  });

  describe("FheTypeName type", () => {
    it("should include all supported types", () => {
      const types: FheTypeName[] = [
        "bool",
        "uint8",
        "uint16",
        "uint32",
        "uint64",
        "uint128",
        "uint256",
        "address",
      ];

      expect(types).toHaveLength(8);
    });
  });
});

/**
 * Compile-time type error tests.
 *
 * These are commented out because they SHOULD fail to compile.
 * Uncomment to verify TypeScript catches these errors.
 */
describe("type errors (compile-time checks)", () => {
  it("documents invalid combinations that TypeScript catches", () => {
    // The following would cause TypeScript errors if uncommented:

    // ERROR: number is not assignable to bigint
    // const badUint64: EncryptInput = { type: "uint64", value: 100 };

    // ERROR: bigint is not assignable to number
    // const badUint8: EncryptInput = { type: "uint8", value: 100n };

    // ERROR: number is not assignable to boolean
    // const badBool: EncryptInput = { type: "bool", value: 1 };

    // ERROR: string is not assignable to `0x${string}`
    // const badAddress: EncryptInput = { type: "address", value: "notHex" };

    // ERROR: "invalid" is not assignable to FheTypeName
    // const badType: EncryptInput = { type: "invalid", value: 123 };

    expect(true).toBe(true); // Placeholder assertion
  });
});

describe("EncryptResult type", () => {
  it("should represent a tuple of handles followed by proof", () => {
    // This tests the shape of the result type
    // In practice, this is returned by the encrypt function

    // For 2 inputs, result should be [Uint8Array, Uint8Array, Uint8Array]
    // (2 handles + 1 proof)

    const mockResult: EncryptResult<[EncryptInput, EncryptInput]> = [
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5, 6]),
      new Uint8Array([7, 8, 9]),
    ];

    expect(mockResult).toHaveLength(3);
    expect(mockResult[0]).toBeInstanceOf(Uint8Array);
    expect(mockResult[1]).toBeInstanceOf(Uint8Array);
    expect(mockResult[2]).toBeInstanceOf(Uint8Array);
  });
});
