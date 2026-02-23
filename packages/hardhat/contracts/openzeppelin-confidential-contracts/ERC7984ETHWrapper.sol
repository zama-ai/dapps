// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ERC7984} from "openzeppelin-confidential-contracts/contracts/token/ERC7984/ERC7984.sol";

abstract contract ERC7984ETHWrapper is ERC7984 {
    uint8 private immutable _decimals;
    uint256 private immutable _rate;

    struct UnwrapRequest {
        address receiver;
        euint64 amount;
    }
    mapping(address => UnwrapRequest) private _pendingUnwraps;

    constructor() {
        uint8 tokenDecimals = 18;
        _decimals = 9;
        _rate = 10 ** (tokenDecimals - 6);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function rate() public view virtual returns (uint256) {
        return _rate;
    }

    function wrap() public payable virtual {
        _mint(msg.sender, FHE.asEuint64(SafeCast.toUint64(msg.value / rate())));
    }

    function unwrap(euint64 amount) internal virtual {
        require(FHE.isAllowed(amount, msg.sender), ERC7984UnauthorizedUseOfEncryptedAmount(amount, msg.sender));
        _unwrap(msg.sender, msg.sender, amount);
    }

    function unwrap(uint64 amount) public virtual {
        _unwrap(msg.sender, msg.sender, FHE.asEuint64(amount));
    }

    function unwrap(externalEuint64 encryptedAmount, bytes calldata inputProof) public virtual {
        _unwrap(msg.sender, msg.sender, FHE.fromExternal(encryptedAmount, inputProof));
    }

    function _unwrap(address from, address to, euint64 amount) internal virtual {
        require(to != address(0), ERC7984InvalidReceiver(to));
        require(from == msg.sender || isOperator(from, msg.sender), ERC7984UnauthorizedSpender(from, msg.sender));

        euint64 burntAmount = _burn(from, amount);
        FHE.allowThis(burntAmount);
        FHE.makePubliclyDecryptable(burntAmount);

        _pendingUnwraps[to] = UnwrapRequest({receiver: to, amount: burntAmount});
    }

    function getUnwrapHandle(address receiver) external view returns (bytes32) {
        return FHE.toBytes32(_pendingUnwraps[receiver].amount);
    }

    function finalizeUnwrap(
        address receiver,
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) public virtual {
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        uint64 amount = abi.decode(cleartexts, (uint64));

        UnwrapRequest storage request = _pendingUnwraps[receiver];
        require(request.receiver != address(0), ERC7984InvalidGatewayRequest(0));
        delete _pendingUnwraps[receiver];

        (bool success, ) = receiver.call{value: amount * rate()}("");
        require(success, "Transfer failed");
    }

    receive() external payable {
        wrap();
    }
}
