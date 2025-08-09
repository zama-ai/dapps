# Confidential Dutch Auction Contracts

Privacy-preserving Dutch auction implementations for selling confidential tokens, built using fhEVM (Fully Homomorphic Encryption Virtual Machine).

## Overview

This folder contains the following implementation of the Dutch auction mechanism:

1. **ConfidentialDutchAuction.sol**:
   - Simpler implementation without intermediate refunds
   - All refunds are processed at the end of the auction
   - More straightforward but might require more funds locked during auction
   - The price starts high and decreases linearly over time
   - Token amounts and payments are encrypted using FHE
   - Users can bid multiple times, with later bids taking advantage of lower prices

## Key Features

- **Privacy Preservation**: All token amounts and payments are encrypted
- **Dynamic Pricing**: Price decreases linearly from starting price to reserve price
- **Flexible Bidding**: Users can bid multiple times as prices decrease
- **Manual Stop Option**: Auctions can be configured to be manually stoppable
- **Owner Controls**: Owner can initialize, stop (if enabled), and cancel the auction

## How It Works

1. **Initialization**:
   - Owner sets starting price, discount rate, reserve price, and token amounts
   - Owner must approve the contract to transfer auction tokens
   - Owner calls `initialize()` to start the auction

2. **Bidding**:
   - Users can bid at any time during the auction
   - Price decreases linearly over time until reaching reserve price
   - Users can bid multiple times
   - Tokens are transferred immediately to the buyer

3. **Claims and Settlement**:
   - After auction ends, users call `claimUserRefund()` to receive refunds
   - After claims period, seller calls `claimSeller()` to receive proceeds and unsold tokens

## Design Choices

#### Without Intermediate Refunds
- Simpler implementation
- All refunds processed at auction end
- Lower gas costs during bidding
- Higher funds locked during auction
- Better suited for shorter auctions
- Each bid is recorded at its own price point
- Final refunds based on difference between paid amounts and final price
- Immediate token transfer on bid
- Two-phase auction conclusion
- Privacy preservation through FHE
- Manual stop capability
- Owner controls

### Dutch Auction Mechanism
1. Users can place bids at any time during the auction period
2. Price decreases linearly over time until reaching reserve price
3. Users can bid multiple times at different price points
4. Tokens are transferred immediately upon successful bid


### Immediate Token Transfer on Bid
Tokens are transferred to buyers immediately upon successfully bidding rather than requiring a separate claim step. This design choice:

- Provides instant gratification to buyers
- Reduces the risk of users forgetting to claim tokens
- Eliminates the need for additional contract interactions
- Improves overall user experience

The tradeoff is higher FHE gas costs during bidding, but this is outweighed by the UX benefits and reduced support overhead.
