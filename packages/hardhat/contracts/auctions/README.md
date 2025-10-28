# Confidential Auction Implementations

This folder contains multiple privacy-preserving auction implementations built using Fully Homomorphic Encryption (FHE):

1. **Blind Auction** ([README_blind.md](./README_blind.md))
   - Classic sealed-bid auction with encrypted bids
   - Winner determination after auction ends
   - Integrated with confidential ERC20 tokens

2. **Dutch Auction** ([README_dutch.md](./README_dutch.md))
   - Descending price auction mechanism
   - Immediate token transfers on bid
   - Multiple implementation variants for different use cases

Both implementations leverage FHE to maintain bid privacy while ensuring fair and verifiable auctions.

See the individual README files for detailed documentation on each implementation.