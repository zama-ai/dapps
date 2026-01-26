# Public Decrypt Example Implementation Plan

## Overview

Add a frontend demo component to test the `usePublicDecrypt` hook using the `PublicDecryptSingleValue` contract.

## Contract Summary

**File:** `packages/hardhat/contracts/basic/decrypt/PublicDecryptSingleValue.sol`

```solidity
contract PublicDecryptSingleValue {
    euint32 private _encryptedUint32;
    uint32 private _clearUint32;

    // Initialize with a value (adds 1 to it encrypted)
    function initializeUint32(uint32 value) external;

    // Mark the encrypted value for public decryption
    function requestDecryptSingleUint32() external;

    // Get the encrypted handle for frontend decryption
    function getHandle() external view returns (bytes32);

    // Callback to store decrypted value on-chain (with proof verification)
    function callbackDecryptSingleUint32(
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external;

    // Read the decrypted value
    function clearUint32() public view returns (uint32);
}
```

## Implementation Steps

### Phase 1: Deploy Contract

**File:** `packages/hardhat/deploy/deploy.ts`

- [ ] Add deployment for `PublicDecryptSingleValue` contract
- [ ] No constructor args needed
- [ ] Add to deployment tags

### Phase 2: Create Frontend Component

**File:** `packages/erc7984example/app/_components/PublicDecryptDemo.tsx`

Create a demo component that:

- [ ] Shows current state (encrypted handle, clear value)
- [ ] Initialize button: calls `initializeUint32(value)` with user input
- [ ] Request decrypt button: calls `requestDecryptSingleUint32()`
- [ ] Public decrypt button: uses `usePublicDecrypt` hook to decrypt client-side
- [ ] Submit callback button: calls `callbackDecryptSingleUint32()` with proof
- [ ] Display the revealed value from contract

### Phase 3: Add to Page

**File:** `packages/erc7984example/app/page.tsx`

- [ ] Import and render `PublicDecryptDemo` component
- [ ] Add as a separate section/tab

## Component Architecture

```
PublicDecryptDemo
├── State Display
│   ├── Encrypted Handle (bytes32)
│   ├── Client Decrypted Value (from usePublicDecrypt)
│   └── On-chain Clear Value (from contract)
│
├── Initialize Section
│   ├── Number input (uint32)
│   └── Initialize button
│
├── Decrypt Flow
│   ├── Step 1: Request Decrypt (marks for public decryption)
│   ├── Step 2: Public Decrypt (client-side with usePublicDecrypt)
│   └── Step 3: Submit Callback (sends proof to contract)
│
└── Status Messages
    └── Transaction status, errors, etc.
```

## Hooks Used

```tsx
// Read contract state
const { data: handle } = useReadContract({ functionName: "getHandle" });
const { data: clearValue } = useReadContract({ functionName: "clearUint32" });

// Public decryption
const { decrypt, decryptAsync, result, clearValues, canDecrypt, isDecrypting } =
  usePublicDecrypt({ handles: handle ? [handle] : undefined });

// Write operations
const { writeContract } = useWriteContract();
```

## User Flow

1. **Initialize**: User enters a number (e.g., 42), clicks Initialize
   - Contract stores encrypted value (42 + 1 = 43 encrypted)

2. **Request Decrypt**: User clicks "Request Public Decrypt"
   - Contract marks the value as publicly decryptable

3. **Client Decrypt**: User clicks "Decrypt"
   - `usePublicDecrypt` fetches decrypted value from relayer
   - Shows client-side decrypted value (43)

4. **Submit to Contract**: User clicks "Submit Proof"
   - Sends `callbackDecryptSingleUint32` with proof
   - Contract verifies and stores clear value

5. **Verify**: Contract's `clearUint32()` now returns 43

## Files to Create/Modify

| File | Action |
|------|--------|
| `packages/hardhat/deploy/deploy.ts` | Add PublicDecryptSingleValue deployment |
| `packages/erc7984example/app/_components/PublicDecryptDemo.tsx` | Create new component |
| `packages/erc7984example/app/page.tsx` | Add component to page |

## Testing Checklist

- [ ] Contract deploys successfully
- [ ] Initialize stores encrypted value
- [ ] getHandle returns valid bytes32
- [ ] requestDecryptSingleUint32 marks for public decrypt
- [ ] usePublicDecrypt successfully decrypts
- [ ] Callback with proof verifies and stores
- [ ] clearUint32 returns correct value

## Notes

- The contract adds 1 to the input value, so input 42 → encrypted 43 → decrypted 43
- Public decryption requires the value to be marked with `FHE.makePubliclyDecryptable()`
- The callback must be called with valid proof from the relayer
