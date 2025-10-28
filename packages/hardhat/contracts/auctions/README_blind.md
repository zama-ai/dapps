# Blind Auction

## Core Concept
This is a privacy-preserving blind auction implemented using Fully Homomorphic Encryption (FHE) through the fhEVM. All bids and critical values are encrypted, ensuring that participants cannot see others' bids during the auction process.

## Key Components

### State Variables
- `highestBid`: Encrypted current highest bid amount
- `winningTicket`: Encrypted ticket corresponding to the highest bid
- `userTickets`: Mapping of user addresses to their encrypted tickets
- `bids`: Mapping of user addresses to their encrypted bid amounts
- `endTime`: When the auction ends
- `beneficiary`: Who receives the winning bid amount
- `tokenContract`: The ConfidentialERC20 token used for bidding

### Process Flow

1. **Initialization**
```solidity
constructor(
    address _beneficiary,
    ConfidentialERC20 _tokenContract,
    uint256 biddingTime,
    bool isStoppable
)
```
- Sets up the auction with a beneficiary, token contract, duration, and whether it can be manually stopped
- Initializes encrypted state variables

2. **Bidding Process**
```solidity
function bid(einput encryptedValue, bytes calldata inputProof)
```
- Users submit encrypted bids
- For each bid:
  - Transfers tokens from bidder to contract
  - Assigns a random encrypted ticket to the bidder
  - Updates highest bid if the new bid is higher
  - Allows multiple bids from the same user

3. **Auction Conclusion**
The auction can end in two ways:
- Natural end when `endTime` is reached
- Manual stop if `stoppable` is true and owner calls `stop()`

4. **Winner Determination**
```solidity
function decryptWinningTicket()
function claim()
```
- After auction ends, winning ticket is decrypted
- Winner can claim by proving they hold the winning ticket
- First highest bidder wins in case of a tie

5. **Settlement**
```solidity
function auctionEnd()
function withdraw()
```
- Winning bid is transferred to beneficiary
- Non-winners can withdraw their bids

## Privacy Features

1. **Encrypted Bids**
- All bids are encrypted using FHE
- Neither participants nor observers can see bid amounts
- Even the contract owner cannot see the bids

2. **Ticket System**
- Each bid gets an encrypted random ticket
- Winning ticket is only decrypted after auction ends
- Prevents front-running and bid manipulation

3. **Confidential Token Integration**
- Uses ConfidentialERC20 for encrypted token transfers
- Bid amounts remain private throughout the process

## Security Measures

1. **Time Controls**
```solidity
modifier onlyBeforeEnd()
modifier onlyAfterEnd()
```
- Strict timing controls for different phases
- Prevents actions at incorrect times

2. **Ownership Management**
- Uses OpenZeppelin's Ownable2Step for secure ownership
- Owner can only stop auction if `stoppable` is true

3. **Safe Token Handling**
- Careful management of token transfers
- Prevents double-spending and ensures proper refunds

## Advantages of This Design

1. **True Privacy**: All sensitive information remains encrypted until necessary
2. **Fair Participation**: No one can see others' bids during the auction
3. **Flexible Bidding**: Users can update their bids multiple times
4. **Secure Settlement**: Automated and secure distribution of tokens and refunds
5. **Verifiable Outcome**: Winner can prove their win without revealing other bids

This implementation provides a robust, private, and fair auction mechanism suitable for confidential token sales or other private auction needs.
