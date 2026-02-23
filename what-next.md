create another page inside @packages/erc7984example featuring wrapping and unwrapping tokens so converting them from erc20s to erc7984. Create two hooks to make this happen useSheild that converts erc20s to erc7984 and useUnsheild that converts erc7984 to erc20s. 

here are the tokens that you should use:

Registered:

| Symbol pairs | ERC20 Address | ERC7984 Address |
| --- | --- | --- |
| (TEST1, cTEST1) | [`0x0D03CF79A2798b35C27b2b52B23674742D278F90`](https://sepolia.etherscan.io/address/0x0D03CF79A2798b35C27b2b52B23674742D278F90#readContract) | [`0x593E77e7E2bEe748aa27942E1f2069b5B6902625`](https://sepolia.etherscan.io/address/0x593E77e7E2bEe748aa27942E1f2069b5B6902625#readProxyContract) |
| (TEST2, cTEST2) | [`0xD616Bc7D4dbC05450dA7F7d3678e4047300bdc40`](https://sepolia.etherscan.io/address/0xD616Bc7D4dbC05450dA7F7d3678e4047300bdc40#readContract) | [`0x9942aBbEAb7f5BcefbA3d9865B148aA79B2E82eB`](https://sepolia.etherscan.io/address/0x9942abbeab7f5bcefba3d9865b148aa79b2e82eb#readProxyContract) |


### ERC20Mocks (mintable)

⚠️ Their `mint`function does not impose any max value, be sure to never mint close to `uint64.max/1e6` (exception : `TEST3` who has a max value of `1_000_000` , with 6 decimals) ⚠️

| Name | Symbol | Decimals | Address |
| --- | --- | --- | --- |
| Token Test 1 | TEST1 | 18 | [`0x0D03CF79A2798b35C27b2b52B23674742D278F90`](https://sepolia.etherscan.io/address/0x0D03CF79A2798b35C27b2b52B23674742D278F90#readContract) |
| Token Test 2 | TEST2 | 18 | [`0xD616Bc7D4dbC05450dA7F7d3678e4047300bdc40`](https://sepolia.etherscan.io/address/0xD616Bc7D4dbC05450dA7F7d3678e4047300bdc40#readContract) |
| Token Test 3 | TEST3 | 6 | [`0x37e2310a502E6F3E48feed658b2bBbcF8B90aba4`](https://sepolia.etherscan.io/address/0x37e2310a502e6f3e48feed658b2bbbcf8b90aba4#readContract) |

### ConfidentialWrapperMocks

| Name | Symbol | Address | Underlying | Owner |
| --- | --- | --- | --- | --- |
| Confidential Token Test 1 | cTEST1 | [`0x593E77e7E2bEe748aa27942E1f2069b5B6902625`](https://sepolia.etherscan.io/address/0x593E77e7E2bEe748aa27942E1f2069b5B6902625#readProxyContract) | [`0x0D03CF79A2798b35C27b2b52B23674742D278F90`](https://sepolia.etherscan.io/address/0x0D03CF79A2798b35C27b2b52B23674742D278F90#readContract) | [`0x15d2a304c67e67425Cd8c91a9f11095111553A98`](https://sepolia.etherscan.io/address/0x15d2a304c67e67425Cd8c91a9f11095111553A98) |
| Confidential Token Test 2 | cTEST2 | [`0x9942aBbEAb7f5BcefbA3d9865B148aA79B2E82eB`](https://sepolia.etherscan.io/address/0x9942abbeab7f5bcefba3d9865b148aa79b2e82eb#readProxyContract) | [`0xD616Bc7D4dbC05450dA7F7d3678e4047300bdc40`](https://sepolia.etherscan.io/address/0xD616Bc7D4dbC05450dA7F7d3678e4047300bdc40#readContract) | [`0x15d2a304c67e67425Cd8c91a9f11095111553A98`](https://sepolia.etherscan.io/address/0x15d2a304c67e67425Cd8c91a9f11095111553A98) |
| Confidential Token Test 3 | cTEST3 | [`0x95922681D71235251C3056c1Ad5409a0D1cD2a84`](https://sepolia.etherscan.io/address/0x95922681D71235251C3056c1Ad5409a0D1cD2a84#readProxyContract) | [`0x37e2310a502E6F3E48feed658b2bBbcF8B90aba4`](https://sepolia.etherscan.io/address/0x37e2310a502e6f3e48feed658b2bbbcf8b90aba4#readContract) | [`0x15d2a304c67e67425Cd8c91a9f11095111553A98`](https://sepolia.etherscan.io/address/0x15d2a304c67e67425Cd8c91a9f11095111553A98) |


Implementation of unwrap:
```
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import {externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/// @dev Interface for ERC7984ERC20Wrapper contract.
interface IERC7984ERC20Wrapper is IERC7984 {
    /// @dev Wraps `amount` of the underlying token into a confidential token and sends it to `to`.
    function wrap(address to, uint256 amount) external;

    /**
     * @dev Unwraps tokens from `from` and sends the underlying tokens to `to`. The caller must be `from`
     * or be an approved operator for `from`.
     *
     * NOTE: The caller *must* already be approved by ACL for the given `amount`.
     */
    function unwrap(address from, address to, externalEuint64 encryptedAmount, bytes calldata inputProof) external;

    /// @dev Fills an unwrap request for a given cipher-text `burntAmount` with the `cleartextAmount` and `decryptionProof`.
    function finalizeUnwrap(euint64 burntAmount, uint64 burntAmountCleartext, bytes calldata decryptionProof) external;

    /// @dev Returns the address of the underlying ERC-20 token that is being wrapped.
    function underlying() external view returns (address);
}
```