# Confidential Dutch Auction Contracts

Privacy-preserving Dutch auction implementations for selling confidential ERC20 tokens, built using fhEVM (Fully Homomorphic Encryption Virtual Machine).

## Overview

This folder contains the following implementation of the Dutch auction mechanism:

1. **DutchAuctionSellingConfidentialERC20NoRefund.sol**:
   - Simpler implementation without intermediate refunds
   - All refunds are processed at the end of the auction
   - More straightforward but might require more funds locked during auction

Both implementations share these common features:
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

### Two Implementation Approaches

#### With Intermediate Refunds (DutchAuctionSellingConfidentialERC20.sol)
- Refunds processed during bidding
- More complex logic but immediate refunds
- Higher gas costs during bidding
- Lower funds locked for users
- Better suited for longer auctions
- Previous bids are automatically adjusted to the new lower price
- Excess payments can be applied to future token purchases

#### Without Intermediate Refunds (DutchAuctionSellingConfidentialERC20NoRefund.sol)
- Simpler implementation
- All refunds processed at auction end
- Lower gas costs during bidding
- Higher funds locked during auction
- Better suited for shorter auctions
- Each bid is recorded at its own price point
- Final refunds based on difference between paid amounts and final price

### Common Design Elements

Both implementations share:
- Immediate token transfer on bid
- Two-phase auction conclusion
- Privacy preservation through FHE
- Manual stop capability
- Owner controls

### Dutch Auction Mechanism
Both implementations follow a Dutch auction mechanism where:

1. Users can place bids at any time during the auction period
2. Price decreases linearly over time until reaching reserve price
3. Users can bid multiple times at different price points
4. Tokens are transferred immediately upon successful bid

The key difference is in how prices and refunds are handled:
- `DutchAuctionSellingConfidentialERC20.sol` adjusts all previous bids to the latest (lower) price
- `DutchAuctionSellingConfidentialERC20NoRefund.sol` keeps track of each bid at its original price

### Immediate Token Transfer on Bid
Tokens are transferred to buyers immediately upon successfully bidding rather than requiring a separate claim step. This design choice:

- Provides instant gratification to buyers
- Reduces the risk of users forgetting to claim tokens
- Eliminates the need for additional contract interactions
- Improves overall user experience

The tradeoff is higher FHE gas costs during bidding, but this is outweighed by the UX benefits and reduced support overhead.

## Mathematics of Refunds

**Basic formula for price calculation:**
```
price = token_amount * token_price
```

### Variable Definitions
 - P1 := price at point 1
 - P2 := price at point 2
 - TA1 := token amount at point 1
 - TA2 := token amount at point 2
 - TP1 := token price at point 1
 - TP2 := token price at point 2
 - P_A1P2 := tokens bought at point 1 priced at point 2 
 - EP := end price or total price you have to pay
 - R := refund price
 - TA := total token amount
 - X := amount that needs to be refunded or the amount which needs to paid

### Key Equations

1. **Token Amount Relationship**
```
TA = TA1 + TA2    // Total tokens is sum of bid amounts
```

2. **Price Calculations**
```
P1 = TA1 * TP1    // First bid price
P2 = TA2 * TP2    // Second bid price
EP = TA * TP2     // Final price at lower rate
   = (TA1 + TA2) * TP2
```

3. **Price Adjustment Calculation**
```
X = EP - P1       // Adjustment needed to reconcile prices
  = (TA1 * TP2 + TA2 * TP2) - (TA1 * TP1)
```

### Calculating the Adjustment (X)


The adjustment amount X is calculated as:
`P1 + X = EP`

Therefore:
```
X = EP - P1
X = TA1 * TP2 + TA2 * TP2 - TA1 * TP1
```

If X > 0: Additional payment is required which equals:
```
X = | P_A1P2 + P2 - P1 |
X = | TA1 * TP2 + TA2 * TP2 - TA1 * TP1 |
```

If X < 0: Refund amount that is due to the user:
```
X = | P1 - (P_A1P2 + P2) |
X = | TA1 * TP1 - TA1 * TP2 - TA2 * TP2 |
```

## Functions

### Core Functions
- `initialize()`: Start the auction
- `bid(einput encryptedValue, bytes calldata inputProof)`: Submit a bid
- `claimUserRefund()`: Claim refunds after auction
- `claimSeller()`: Seller claims proceeds after auction
- `getPrice()`: Get current token price
- `getUserBid()`: Get user's current bid information

### Administrative Functions
- `stop()`: Manually stop the auction (if enabled)
- `cancelAuction()`: Cancel auction and return tokens to seller
- `requestTokensLeftReveal()`: Request decryption of remaining tokens
- `initialize()`: Initialize the auction with tokens from seller

## Security Features

- Uses OpenZeppelin's Ownable2Step for secure ownership management
- All sensitive values are encrypted using fhEVM
- Built-in checks for auction timing and token availability
- Zero-knowledge proofs for bid validation

## Requirements

- Solidity ^0.8.24
- fhEVM compatible environment
- OpenZeppelin Contracts
- Zama fhEVM contracts

## Usage

1. Deploy the contract with desired parameters:
   - Starting price
   - Discount rate
   - Token addresses (auction token and payment token)
   - Amount of tokens
   - Reserve price
   - Stoppable flag

2. Initialize the auction by calling `initialize()`

3. Users can participate by calling `bid()` with encrypted values

4. After auction ends:
   - Users call `claimUserRefund()` to receive refunds
   - Seller calls `claimSeller()` to receive proceeds

## License

MIT