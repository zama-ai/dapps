# MyConfidentialERC20.sol

**How it works**
1. **Confidential Token**: A privacy-preserving ERC20 token using FHE with encrypted balances, transfers and approvals.

2. **Key Features**: Encrypted balances (euint64), standard ERC20 functions with FHE, and owner-restricted minting.

3. **Privacy Protection**: All operations are encrypted using FHE, with balances visible only to transaction participants.

The contract implements confidential tokens with ERC20 compatibility using FHE for privacy.