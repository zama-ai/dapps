// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint8, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract FHEAdd is ZamaEthereumConfig {
    euint8 private _a;
    euint8 private _b;
    // solhint-disable-next-line var-name-mixedcase
    euint8 private _a_plus_b;

    // solhint-disable-next-line no-empty-blocks
    constructor() {}

    function setA(externalEuint8 inputA, bytes calldata inputProof) external {
        _a = FHE.fromExternal(inputA, inputProof);
        FHE.allowThis(_a);
    }

    function setB(externalEuint8 inputB, bytes calldata inputProof) external {
        _b = FHE.fromExternal(inputB, inputProof);
        FHE.allowThis(_b);
    }

    function computeAPlusB() external {
        // The sum `a + b` is computed by the contract itself (`address(this)`).
        // Since the contract has FHE permissions over both `a` and `b`,
        // it is authorized to perform the `FHE.add` operation on these values.
        // It does not matter if the contract caller (`msg.sender`) has FHE permission or not.
        _a_plus_b = FHE.add(_a, _b);

        // At this point the contract ifself (`address(this)`) has been granted ephemeral FHE permission
        // over `_a_plus_b`. This FHE permission will be revoked when the function exits.
        //
        // Now, to make sure `_a_plus_b` can be decrypted by the contract caller (`msg.sender`),
        // we need to grant permanent FHE permissions to both the contract ifself (`address(this)`)
        // and the contract caller (`msg.sender`)
        FHE.allowThis(_a_plus_b);
        FHE.allow(_a_plus_b, msg.sender);
    }

    function result() public view returns (euint8) {
        return _a_plus_b;
    }
}
