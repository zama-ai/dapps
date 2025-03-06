# Confidential Dutch Auction Contract

A privacy-preserving Dutch auction implementation for selling confidential ERC20 tokens, built using fhEVM (Fully Homomorphic Encryption Virtual Machine).

## Overview

This contract implements a Dutch auction mechanism where:
- The price starts high and decreases linearly over time
- Token amounts and payments are encrypted using FHE
- Users can bid multiple times, with later bids taking advantage of lower prices
- Unused payments from earlier bids can be applied to new token purchases

## Key Features

- **Privacy Preservation**: All token amounts and payments are encrypted
- **Dynamic Pricing**: Price decreases linearly from starting price to reserve price
- **Flexible Bidding**: Users can bid multiple times as prices decrease
- **Automatic Refunds**: Excess payments are automatically refunded at auction end
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
   - Users can bid multiple times, with each bid:
     - Automatically adjusting previous bids to current lower price
     - Transferring tokens immediately to the buyer
     - Managing refunds or additional payments as needed

3. **Claims and Settlement**:
   - After auction ends, users call `claimUserRefund()` to receive refunds
   - After claims period, seller calls `claimSeller()` to receive proceeds and unsold tokens

## Design choices

### "Soft Dutch auction" mechanism
Unlike a classical Dutch auction where prices are locked in immediately upon bidding, this implementation uses a "soft" or "rolling" Dutch auction mechanism where:

1. Users can place bids at any time during the auction period
2. The effective price for all tokens is determined by the latest bid price
3. Previous bids are automatically adjusted to the new lower price
4. Excess payments are tracked and can be:
   - Applied to future token purchases
   - Claimed as refunds after the auction ends

While this approach is more computationally expensive due to price recalculations, it offers several advantages:
- Encourages continued participation as prices decrease
- Allows users to efficiently use their existing deposits
- Creates a more dynamic and engaging auction process
- Treats all participants fairly by giving the same final price
  
_Mathematics of the `bid` function are explained in the Mathematics section_

If recalculations preformed in the `bid` function are deemed to be too computationally expensive, another `refund` function could be potentially created where users claim their refunds.

### Immediate token transfer on bid
Tokens are transferred to buyers immediately upon successfully bidding rather than requiring a separate claim step. This design choice:

- Provides instant gratification to buyers
- Reduces the risk of users forgetting to claim tokens
- Eliminates the need for additional contract interactions
- Improves overall user experience

The tradeoff is higher FHE gas costs during bidding, but this is outweighed by the UX benefits and reduced support overhead.

### Two-phase auction conclusion
The auction uses a two-phase conclusion process:

1. Bidding Phase (`startTime` to `expiresAt`):
   - Active bidding period
   - Price decreases according to discount rate
   - Immediate token transfers on successful bids

2. Claims Phase (`expiresAt` to `claimsExpiresAt`):
   - No new bids accepted
   - Users can claim refunds from price adjustments using `claimUserRefund()`
   - Duration is 3x the bidding period

3. Seller Claim Phase (`claimsExpiresAt` onward):
   - Users cannot claim refunds any longer
   - Seller claims remaining funds and tokens using `claimSeller()`

This design:
- Ensures users have adequate time to claim refunds
- Prevents the seller from withdrawing funds before users can claim
- Provides clear timeframes for all participants
- Doesn't require the bidder to have to calculate how many tokens they can take without taking users refunds.

The extended claims period (3x bidding time) could be adjusted based on specific needs, but provides a reasonable window for users to act while not indefinitely locking seller funds.

## Mathematics

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