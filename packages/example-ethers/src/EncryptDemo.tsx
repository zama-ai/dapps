import { useState } from "react";
import { useFhevmContext, useEncrypt, type EncryptInput } from "fhevm-sdk";

// Example contract address (you would replace this with your actual contract)
const DEMO_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000001" as const;

export function EncryptDemo() {
  const { status, error: fhevmError, instance } = useFhevmContext();
  const [inputValue, setInputValue] = useState("");
  const [encryptedResult, setEncryptedResult] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptError, setEncryptError] = useState<Error | null>(null);

  const { encrypt, isReady } = useEncrypt();

  const handleEncrypt = async () => {
    if (!inputValue || !isReady) return;

    setIsEncrypting(true);
    setEncryptError(null);

    try {
      const value = BigInt(inputValue);
      const inputs: EncryptInput[] = [{ type: "uint64", value }];

      const result = await encrypt(inputs, DEMO_CONTRACT_ADDRESS);

      if (result) {
        // Result is a tuple: [handle, proof]
        const handle = result[0] as Uint8Array;
        const handleHex = Array.from(handle)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        setEncryptedResult(`Handle: 0x${handleHex.slice(0, 32)}...`);
      }
    } catch (err) {
      setEncryptError(err instanceof Error ? err : new Error("Encryption failed"));
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: "1rem" }}>
      <h2>FHEVM Status</h2>
      <p>Status: <strong>{status}</strong></p>
      <p>Instance ready: {instance ? "Yes" : "No"}</p>
      <p>Encrypt ready: {isReady ? "Yes" : "No"}</p>
      {fhevmError && <p style={{ color: "red" }}>Error: {fhevmError.message}</p>}

      <h3>Encrypt a Number</h3>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter a number"
          disabled={!isReady || isEncrypting}
        />
        <button
          onClick={handleEncrypt}
          disabled={!isReady || isEncrypting || !inputValue}
        >
          {isEncrypting ? "Encrypting..." : "Encrypt"}
        </button>
      </div>

      {encryptError && <p style={{ color: "red" }}>Encrypt error: {encryptError.message}</p>}
      {encryptedResult && (
        <p style={{ wordBreak: "break-all" }}>
          <strong>Result:</strong> {encryptedResult}
        </p>
      )}
    </div>
  );
}
