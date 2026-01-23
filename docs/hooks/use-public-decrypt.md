# usePublicDecrypt

Hook for public decryption of FHE encrypted values.

## Import

```tsx
import { usePublicDecrypt } from "fhevm-sdk";
```

## Overview

Public decryption reveals encrypted values to everyone. Use this when:

- The value should be visible on-chain (e.g., auction results, game outcomes)
- You need to pass decrypted values to a contract callback with proof
- No user-specific privacy is required

**Important:** Values must be marked as publicly decryptable on-chain using `FHE.makePubliclyDecryptable(handle)` before calling this hook.

## Usage

```tsx
function AuctionResult({ handles }) {
  const { decrypt, clearValues, isDecrypting, canDecrypt } = usePublicDecrypt({
    handles,
  });

  return (
    <div>
      <p>Winner: {clearValues[handles[0]]?.toString() ?? "Hidden"}</p>
      <button onClick={decrypt} disabled={!canDecrypt}>
        {isDecrypting ? "Revealing..." : "Reveal Result"}
      </button>
    </div>
  );
}
```

## Parameters

```tsx
usePublicDecrypt({
  handles: (string | undefined)[] | undefined;
});
```

| Parameter | Type                              | Description                    |
| --------- | --------------------------------- | ------------------------------ |
| `handles` | `(string \| undefined)[]`         | Array of encrypted handles     |

## Returns

| Property          | Type                                          | Description                          |
| ----------------- | --------------------------------------------- | ------------------------------------ |
| `canDecrypt`      | `boolean`                                     | Whether decryption can be called     |
| `decrypt`         | `() => void`                                  | Trigger decryption                   |
| `decryptAsync`    | `() => Promise<PublicDecryptResult>`          | Async trigger returning result       |
| `result`          | `PublicDecryptResult \| undefined`            | Full result with proof               |
| `clearValues`     | `Record<string, string \| bigint \| boolean>` | Decrypted values by handle           |
| `isDecrypting`    | `boolean`                                     | Whether in progress                  |
| `message`         | `string`                                      | Status message for UI                |
| `error`           | `string \| null`                              | Error message if failed              |
| `clearError`      | `() => void`                                  | Clear error state                    |
| `isSuccess`       | `boolean`                                     | Whether succeeded                    |
| `isError`         | `boolean`                                     | Whether failed                       |
| `isIdle`          | `boolean`                                     | Whether not started                  |

## PublicDecryptResult

The full result includes data needed for contract callbacks:

```tsx
interface PublicDecryptResult {
  /** Decrypted values keyed by handle */
  clearValues: Record<string, string | bigint | boolean>;

  /** ABI-encoded clear values for contract callback */
  abiEncodedClearValues: `0x${string}`;

  /** Decryption proof for contract verification */
  decryptionProof: `0x${string}`;
}
```

## Contract Integration

### Solidity Contract

First, mark values as publicly decryptable on-chain:

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";

contract PublicAuction {
    euint64 private _winningBid;
    uint64 public revealedWinningBid;

    // Request public decryption
    function revealWinner() external {
        FHE.makePubliclyDecryptable(_winningBid);
    }

    // Get handle for frontend
    function getWinningBidHandle() external view returns (bytes32) {
        return FHE.toBytes32(_winningBid);
    }

    // Callback to receive decrypted value
    function callbackReveal(
        bytes32[] calldata handles,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        // Verify the decryption proof
        FHE.checkSignatures(handles, cleartexts, decryptionProof);

        // Decode the decrypted value
        uint64 winningBid = abi.decode(cleartexts, (uint64));
        revealedWinningBid = winningBid;
    }
}
```

### React Component with Callback

```tsx
import { usePublicDecrypt } from "fhevm-sdk";
import { useWriteContract, useReadContract } from "wagmi";

function RevealAuction({ contractAddress }) {
  // Get handle from contract
  const { data: handle } = useReadContract({
    address: contractAddress,
    abi: auctionAbi,
    functionName: "getWinningBidHandle",
  });

  const handles = handle ? [handle] : undefined;

  const { decryptAsync, canDecrypt, isDecrypting } = usePublicDecrypt({
    handles,
  });

  const { writeContract } = useWriteContract();

  const handleReveal = async () => {
    // 1. Public decrypt
    const result = await decryptAsync();
    if (!result) return;

    // 2. Call contract callback with proof
    await writeContract({
      address: contractAddress,
      abi: auctionAbi,
      functionName: "callbackReveal",
      args: [handles, result.abiEncodedClearValues, result.decryptionProof],
    });
  };

  return (
    <button onClick={handleReveal} disabled={!canDecrypt}>
      {isDecrypting ? "Revealing..." : "Reveal Winner"}
    </button>
  );
}
```

## Multiple Values

Decrypt multiple values at once:

```tsx
function RevealMultiple({ contractAddress }) {
  const { data: handles } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "getHandles",
  });

  const { decrypt, clearValues, result, canDecrypt } = usePublicDecrypt({
    handles,
  });

  return (
    <div>
      <button onClick={decrypt} disabled={!canDecrypt}>
        Reveal All
      </button>

      {handles?.map((handle, i) => (
        <p key={handle}>
          Value {i}: {clearValues[handle]?.toString() ?? "Hidden"}
        </p>
      ))}

      {result && (
        <pre>
          Proof: {result.decryptionProof.slice(0, 20)}...
        </pre>
      )}
    </div>
  );
}
```

## Comparison with useUserDecrypt

| Aspect           | usePublicDecrypt                | useUserDecrypt                    |
| ---------------- | ------------------------------- | --------------------------------- |
| Privacy          | Values visible to everyone      | Values visible only to user       |
| Signature        | Not required                    | Requires user signature           |
| Contract setup   | `FHE.makePubliclyDecryptable()` | `FHE.allow(handle, userAddress)`  |
| Use case         | Auction results, game outcomes  | Private balances, personal data   |
| Returns          | Includes proof for callbacks    | Just decrypted values             |

## Error Handling

```tsx
function SafeReveal({ handles }) {
  const { decrypt, clearValues, error, isError, clearError, canDecrypt } =
    usePublicDecrypt({ handles });

  if (isError) {
    return (
      <div>
        <p>Failed to reveal: {error}</p>
        <button onClick={clearError}>Dismiss</button>
      </div>
    );
  }

  return (
    <button onClick={decrypt} disabled={!canDecrypt}>
      Reveal
    </button>
  );
}
```

## Bit Length Limits

Public decryption has a limit of 2048 bits total per request:

| Type       | Bits  | Max per request |
| ---------- | ----- | --------------- |
| `ebool`    | 8     | 256             |
| `euint8`   | 8     | 256             |
| `euint16`  | 16    | 128             |
| `euint32`  | 32    | 64              |
| `euint64`  | 64    | 32              |
| `euint128` | 128   | 16              |
| `euint256` | 256   | 8               |
| `eaddress` | 160   | 12              |

If you exceed the limit, split into multiple requests.
