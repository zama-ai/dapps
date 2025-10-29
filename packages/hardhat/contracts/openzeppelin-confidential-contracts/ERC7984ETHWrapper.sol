// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// FIXME: NOT AUDITED CODE

import { FHE, externalEuint64, euint64 } from "@fhevm/solidity/lib/FHE.sol";
import { IERC20 } from "@openzeppelin/contracts/interfaces/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/**
 * FIXME: NOT AUDITED
 * @dev A wrapper contract built on top of {ERC7984} that allows wrapping an `ERC20` token
 * into a confidential fungible token. The wrapper contract implements the `IERC1363Receiver` interface
 * which allows users to transfer `ERC1363` tokens directly to the wrapper with a callback to wrap the tokens.
 */
abstract contract ERC7984ETHWrapper is ERC7984 {
    
    uint8 private immutable _decimals;
    uint256 private immutable _rate;

    /// @dev Mapping from gateway decryption request ID to the address that will receive the tokens
    mapping(uint256 decryptionRequest => address) private _receivers;

    constructor() {
        uint8 tokenDecimals = 18;
        _decimals = 9;
        _rate = 10 ** (tokenDecimals - 6);
    }

    /// @inheritdoc ERC7984
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Returns the rate at which the underlying token is converted to the wrapped token.
     * For example, if the `rate` is 1000, then 1000 units of the underlying token equal 1 unit of the wrapped token.
     */
    function rate() public view virtual returns (uint256) {
        return _rate;
    }

     /**
     * @dev Wraps amount `amount` of the underlying token into a confidential token and sends it to
     * `to`. Tokens are exchanged at a fixed rate specified by {rate} such that `amount / rate()` confidential
     * tokens are sent. Amount transferred in is rounded down to the nearest multiple of {rate}.
     */
    function wrap() public payable virtual {
        // mint confidential token
        _mint(msg.sender, FHE.asEuint64(SafeCast.toUint64(msg.value / rate())));
    }

    /**
     * @dev Unwraps tokens from `from` and sends the underlying tokens to `to`. The caller must be `from`
     * or be an approved operator for `from`. `amount * rate()` underlying tokens are sent to `to`.
     *
     * NOTE: This is an asynchronous function and waits for decryption to be completed off-chain before disbursing
     * tokens.
     * NOTE: The caller *must* already be approved by ACL for the given `amount`.
     */
    function unwrap(euint64 amount) internal virtual {
        require(
            FHE.isAllowed(amount, msg.sender),
            ERC7984UnauthorizedUseOfEncryptedAmount(amount, msg.sender)
        );
        _unwrap(msg.sender, msg.sender, amount);
    }

    // Unwrap helper with clear input
    function unwrap(uint64 amount) public virtual {
        _unwrap(msg.sender, msg.sender, FHE.asEuint64(amount));
    }

    /**
     * @dev Variant of {unwrap} that passes an `inputProof` which approves the caller for the `encryptedAmount`
     * in the ACL.
     */
    function unwrap(
        externalEuint64 encryptedAmount, 
        bytes calldata inputProof
    ) public virtual {
        _unwrap(msg.sender, msg.sender, FHE.fromExternal(encryptedAmount, inputProof));
    }

    /**
     * @dev Called by the fhEVM gateway with the decrypted amount `amount` for a request id `requestId`.
     * Fills unwrap requests.
     */
    function finalizeUnwrap(
        uint256 requestID,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) public virtual {
        FHE.checkSignatures(requestID, cleartexts, decryptionProof);
        (uint64 amount) = abi.decode(cleartexts, (uint64));

        address to = _receivers[requestID];
        require(to != address(0), ERC7984InvalidGatewayRequest(requestID));
        delete _receivers[requestID];

        (bool success, ) = to.call{value: amount * rate()}("");
        require(success, "Transfer failed");
    }

    function _unwrap(address from, address to, euint64 amount) internal virtual {
        require(to != address(0), ERC7984InvalidReceiver(to));
        require(
            from == msg.sender || isOperator(from, msg.sender),
            ERC7984UnauthorizedSpender(from, msg.sender)
        );

        // try to burn, see how much we actually got
        euint64 burntAmount = _burn(from, amount);

        // decrypt that burntAmount
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(burntAmount);
        uint256 requestID = FHE.requestDecryption(
            cts,
            this.finalizeUnwrap.selector
        );

        // register who is getting the tokens
        _receivers[requestID] = to;
    }

    /**
     * @notice  Receive function calls wrap().
     */
    receive() external payable {
        wrap();
    }
}