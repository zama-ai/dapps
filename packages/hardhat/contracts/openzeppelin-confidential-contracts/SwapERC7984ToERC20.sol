// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC7984} from "openzeppelin-confidential-contracts/contracts/interfaces/IERC7984.sol";

contract SwapConfidentialToERC20 {
    error SwapConfidentialToERC20InvalidRequest(address user);

    struct SwapRequest {
        address receiver;
        euint64 amount;
    }
    mapping(address => SwapRequest) private _pendingSwaps;

    IERC7984 private _fromToken;
    IERC20 private _toToken;

    constructor(IERC7984 fromToken, IERC20 toToken) {
        _fromToken = fromToken;
        _toToken = toToken;
    }

    function swapConfidentialToERC20(externalEuint64 encryptedInput, bytes memory inputProof) public {
        euint64 amount = FHE.fromExternal(encryptedInput, inputProof);
        FHE.allowTransient(amount, address(_fromToken));
        euint64 amountTransferred = _fromToken.confidentialTransferFrom(msg.sender, address(this), amount);

        FHE.allowThis(amountTransferred);
        FHE.makePubliclyDecryptable(amountTransferred);

        _pendingSwaps[msg.sender] = SwapRequest({receiver: msg.sender, amount: amountTransferred});
    }

    function getSwapHandle(address user) external view returns (bytes32) {
        return FHE.toBytes32(_pendingSwaps[user].amount);
    }

    function finalizeSwap(
        address user,
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) public virtual {
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        uint64 amount = abi.decode(cleartexts, (uint64));

        SwapRequest storage request = _pendingSwaps[user];
        require(request.receiver != address(0), SwapConfidentialToERC20InvalidRequest(user));
        address to = request.receiver;
        delete _pendingSwaps[user];

        if (amount != 0) {
            SafeERC20.safeTransfer(_toToken, to, amount);
        }
    }
}
