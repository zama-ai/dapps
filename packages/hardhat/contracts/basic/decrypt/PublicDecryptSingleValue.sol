// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract PublicDecryptSingleValue is ZamaEthereumConfig {
    euint32 private _encryptedUint32;
    uint32 private _clearUint32;

    constructor() {}

    function initializeUint32(uint32 value) external {
        _encryptedUint32 = FHE.add(FHE.asEuint32(value), FHE.asEuint32(1));
        FHE.allowThis(_encryptedUint32);
    }

    function initializeUint32Wrong(uint32 value) external {
        _encryptedUint32 = FHE.add(FHE.asEuint32(value), FHE.asEuint32(1));
    }

    function requestDecryptSingleUint32() external {
        FHE.makePubliclyDecryptable(_encryptedUint32);
    }

    function getHandle() external view returns (bytes32) {
        return FHE.toBytes32(_encryptedUint32);
    }

    function callbackDecryptSingleUint32(
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        _clearUint32 = abi.decode(cleartexts, (uint32));
    }

    function clearUint32() public view returns (uint32) {
        return _clearUint32;
    }
}
