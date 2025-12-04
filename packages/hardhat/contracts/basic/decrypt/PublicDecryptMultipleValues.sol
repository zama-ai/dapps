// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint32, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract PublicDecryptMultipleValues is ZamaEthereumConfig {
    ebool private _encryptedBool;
    euint32 private _encryptedUint32;
    euint64 private _encryptedUint64;

    bool private _clearBool;
    uint32 private _clearUint32;
    uint64 private _clearUint64;

    constructor() {}

    function initialize(bool a, uint32 b, uint64 c) external {
        _encryptedBool = FHE.xor(FHE.asEbool(a), FHE.asEbool(false));
        _encryptedUint32 = FHE.add(FHE.asEuint32(b), FHE.asEuint32(1));
        _encryptedUint64 = FHE.add(FHE.asEuint64(c), FHE.asEuint64(1));

        FHE.allowThis(_encryptedBool);
        FHE.allowThis(_encryptedUint32);
        FHE.allowThis(_encryptedUint64);
    }

    function requestDecryptMultipleValues() external {
        FHE.makePubliclyDecryptable(_encryptedBool);
        FHE.makePubliclyDecryptable(_encryptedUint32);
        FHE.makePubliclyDecryptable(_encryptedUint64);
    }

    function getHandles() external view returns (bytes32[] memory) {
        bytes32[] memory handles = new bytes32[](3);
        handles[0] = FHE.toBytes32(_encryptedBool);
        handles[1] = FHE.toBytes32(_encryptedUint32);
        handles[2] = FHE.toBytes32(_encryptedUint64);
        return handles;
    }

    function callbackDecryptMultipleValues(
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);

        (bool decryptedBool, uint32 decryptedUint32, uint64 decryptedUint64) = abi.decode(
            cleartexts,
            (bool, uint32, uint64)
        );
        _clearBool = decryptedBool;
        _clearUint32 = decryptedUint32;
        _clearUint64 = decryptedUint64;
    }

    function clearBool() public view returns (bool) {
        return _clearBool;
    }

    function clearUint32() public view returns (uint32) {
        return _clearUint32;
    }

    function clearUint64() public view returns (uint64) {
        return _clearUint64;
    }
}
