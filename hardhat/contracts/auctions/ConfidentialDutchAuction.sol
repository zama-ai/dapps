// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {FHE, externalEuint64, euint64, eaddress, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ConfidentialFungibleToken} from "openzeppelin-confidential-contracts/contracts/token/ConfidentialFungibleToken.sol";

/// @title Dutch Auction for Selling Confidential ERC20 Tokens
/// @notice Implements a Dutch auction mechanism for selling confidential ERC20 tokens
/// @dev Uses FHEVM for handling encrypted values and transactions

contract ConfidentialDutchAuction is SepoliaConfig, ReentrancyGuard, Ownable2Step {
    /// @notice The ERC20 token being auctioned
    ConfidentialFungibleToken public immutable auctionToken;
    /// @notice The token used for payments
    ConfidentialFungibleToken public immutable paymentToken;
    /// @notice Encrypted amount of tokens remaining in the auction
    euint64 private tokensLeft;

    /// @notice Address of the seller
    address payable public immutable seller;
    /// @notice Initial price per token
    uint64 public immutable startingPrice;
    /// @notice Rate at which the price decreases
    uint64 public immutable discountRate;
    /// @notice Timestamp when the auction starts
    uint256 public immutable startAt;
    /// @notice Timestamp when the auction ends
    uint256 public immutable expiresAt;
    /// @notice Minimum price per token
    uint64 public immutable reservePrice;
    /// @notice Total amount of tokens being auctioned
    uint64 public immutable amount;
    /// @notice Flag indicating if the auction has started
    bool public auctionStart = false;

    /// @notice Flag to determine if the auction can be stopped manually
    bool public stoppable;

    /// @notice Flag to check if the auction has been manually stopped
    bool public manuallyStopped = false;

    /// @notice Decrypted value of remaining tokens
    uint64 public tokensLeftReveal;

    /// @notice Structure to store bid information
    /// @param tokenAmount Amount of tokens bid for
    /// @param paidAmount Amount paid for the tokens
    struct Bid {
        euint64 tokenAmount;
        euint64 paidAmount;
    }
    /// @notice Mapping of addresses to their bids
    mapping(address => Bid) public bids;

    /// @notice Emitted when a bid is submitted
    /// @param buyer Address of the bidder
    /// @param pricePerToken Price per token at the time of bid
    event BidSubmitted(address indexed buyer, uint pricePerToken);

    /// @notice Error thrown when a function is called too early
    /// @dev Includes the time when the function can be called
    error TooEarly(uint256 time);

    /// @notice Error thrown when a function is called too late
    /// @dev Includes the time after which the function cannot be called
    error TooLate(uint256 time);

    /// @notice Error thrown when trying to start an already started auction
    error AuctionAlreadyStarted();
    /// @notice Error thrown when trying to interact with an unstarted auction
    error AuctionNotStarted();

    /// @notice Error thrown when starting price is less than reserve price
    error StartingPriceBelowReservePrice();
    /// @notice Error thrown when reserve price is zero or negative
    error InvalidReservePrice();

    /// @notice Creates a new Dutch auction contract
    /// @param _startingPrice Initial price per token
    /// @param _discountRate Rate at which price decreases
    /// @param _token Address of token being auctioned
    /// @param _paymentToken Address of token used for payment
    /// @param _amount Total amount of tokens to auction
    /// @param _reservePrice Minimum price per token
    /// @param _biddingTime Duration of the auction in seconds
    /// @param _isStoppable Whether the auction can be stopped manually
    /// @param _seller Address of the seller
    constructor(
        uint64 _startingPrice,
        uint64 _discountRate,
        ConfidentialFungibleToken _token,
        ConfidentialFungibleToken _paymentToken,
        uint64 _amount,
        uint64 _reservePrice,
        uint256 _biddingTime,
        bool _isStoppable,
        address _seller
    ) Ownable(_seller) {
        seller = payable(_seller);
        startingPrice = _startingPrice;
        discountRate = _discountRate;
        startAt = block.timestamp;
        expiresAt = block.timestamp + _biddingTime;
        reservePrice = _reservePrice;
        stoppable = _isStoppable;

        if (_startingPrice <= _reservePrice) revert StartingPriceBelowReservePrice();
        if (_reservePrice <= 0) revert InvalidReservePrice();

        amount = _amount; // initial amount should be known
        tokensLeft = FHE.asEuint64(_amount);
        tokensLeftReveal = _amount;
        auctionToken = _token;
        paymentToken = _paymentToken;
        FHE.allowThis(tokensLeft);
        FHE.allow(tokensLeft, owner());
    }

    /// @notice Initializes the auction by transferring tokens from seller
    /// @dev Can only be called once by the owner
    function initialize() external onlyOwner {
        if (auctionStart) revert AuctionAlreadyStarted();

        euint64 encAmount = FHE.asEuint64(amount);

        FHE.allowTransient(encAmount, address(auctionToken));

        // Transfer tokens from seller to the auction contract
        auctionToken.confidentialTransferFrom(msg.sender, address(this), encAmount);

        euint64 balanceAfter = auctionToken.confidentialBalanceOf(address(this));

        ebool encAuctionStart = FHE.select(FHE.ge(balanceAfter, amount), FHE.asEbool(true), FHE.asEbool(false));

        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(encAuctionStart);
        FHE.requestDecryption(cts, this.callbackBool.selector);
    }

    /// @notice Callback function for boolean decryption
    /// @dev Only callable by the Gateway contract
    /// @param encAuctionStart The decrypted boolean
    /// @return The decrypted value
    function callbackBool(uint256 requestId, bool encAuctionStart, bytes[] memory signatures) public returns (bool) {
        FHE.checkSignatures(requestId, signatures);
        auctionStart = encAuctionStart;
        return encAuctionStart;
    }

    /// @notice Gets the current price per token
    /// @dev Price decreases linearly over time until it reaches reserve price
    /// @return Current price per token in payment token units
    function getPrice() public view returns (uint64) {
        uint256 timeElapsed = block.timestamp - startAt;
        if (block.timestamp > expiresAt) {
            timeElapsed = expiresAt - startAt;
        }

        uint256 discount = (discountRate * timeElapsed) / 3600 / 24;
        uint64 currentPrice = startingPrice > uint64(discount) ? startingPrice - uint64(discount) : 0;
        return currentPrice > reservePrice ? currentPrice : reservePrice;
    }

    /// @notice Manually stop the auction
    /// @dev Can only be called by the owner and if the auction is stoppable
    function stop() external onlyOwner {
        require(stoppable);
        manuallyStopped = true;
    }

    /// @notice Submit a bid for tokens
    /// @dev Handles bid logic including refunds from previous bids
    /// @param encryptedValue Encrypted amount of tokens to bid for
    /// @param inputProof Zero-knowledge proof for the encrypted input
    function bid(externalEuint64 encryptedValue, bytes calldata inputProof) external onlyBeforeEnd {
        euint64 newTokenAmount = FHE.fromExternal(encryptedValue, inputProof);
        uint64 currentPricePerToken = getPrice();

        // Calculate how many new tokens can be bought
        newTokenAmount = FHE.min(newTokenAmount, tokensLeft);

        // Amount of money to pay
        euint64 amountToTransfer = FHE.mul(currentPricePerToken, newTokenAmount);

        // Transfer money, and only if OK send the tokens
        euint64 transferredBalance = _handleTransfer(amountToTransfer);
        ebool transferOK = FHE.eq(transferredBalance, amountToTransfer);

        // Transfer tokens
        euint64 tokensToTransfer = FHE.select(transferOK, newTokenAmount, FHE.asEuint64(0));
        _handleTokenTransfer(tokensToTransfer);

        // Update bid
        _updateBidInfo(tokensToTransfer, transferredBalance);

        emit BidSubmitted(msg.sender, currentPricePerToken);
    }

    /// @dev Helper function to handle token transfers
    function _handleTransfer(euint64 amountToTransfer) private returns (euint64) {
        euint64 balanceBefore = paymentToken.confidentialBalanceOf(address(this));
        FHE.allowTransient(amountToTransfer, address(paymentToken));
        paymentToken.confidentialTransferFrom(msg.sender, address(this), amountToTransfer);
        euint64 balanceAfter = paymentToken.confidentialBalanceOf(address(this));
        return FHE.sub(balanceAfter, balanceBefore);
    }

    /// @dev Helper function to handle refunds
    function _handleRefund(euint64 amountToTransfer) private {
        FHE.allowTransient(amountToTransfer, address(paymentToken));
        paymentToken.confidentialTransfer(msg.sender, amountToTransfer);
    }

    /// @dev Helper function to handle token transfer
    function _handleTokenTransfer(euint64 amountToTransfer) private {
        FHE.allowTransient(amountToTransfer, address(auctionToken));
        auctionToken.confidentialTransfer(msg.sender, amountToTransfer);
    }

    /// @dev Helper function to update bid information
    function _updateBidInfo(euint64 newTokenAmount, euint64 newPaidAmount) private {
        // Handle previous bid adjustments
        Bid storage userBid = bids[msg.sender];

        if (FHE.isInitialized(userBid.tokenAmount)) {
            bids[msg.sender].tokenAmount = FHE.add(newTokenAmount, bids[msg.sender].tokenAmount);
            bids[msg.sender].paidAmount = FHE.add(newPaidAmount, bids[msg.sender].paidAmount);
        } else {
            bids[msg.sender].tokenAmount = newTokenAmount;
            bids[msg.sender].paidAmount = newPaidAmount;
        }
        FHE.allowThis(bids[msg.sender].tokenAmount);
        FHE.allowThis(bids[msg.sender].paidAmount);
        FHE.allow(bids[msg.sender].tokenAmount, msg.sender);
        FHE.allow(bids[msg.sender].paidAmount, msg.sender);

        // Update remaining tokens
        tokensLeft = FHE.sub(tokensLeft, newTokenAmount);
        FHE.allowThis(tokensLeft);
        FHE.allow(tokensLeft, owner());
    }

    /// @notice Claim tokens and refund for a bidder after auction ends
    /// @dev Transfers tokens to bidder and refunds excess payment based on final price
    function claimUserRefund() external onlyAfterAuctionEnds {
        Bid storage userBid = bids[msg.sender];

        uint64 finalPrice = getPrice();
        euint64 finalPricePerToken = FHE.asEuint64(finalPrice);
        euint64 finalCost = FHE.mul(finalPricePerToken, userBid.tokenAmount);
        euint64 refundAmount = FHE.sub(userBid.paidAmount, finalCost);

        // Transfer refund
        _handleRefund(refundAmount);

        // Clear the bid
        delete bids[msg.sender];
    }

    /// @notice Claim proceeds for the seller after auction ends
    /// @dev Transfers all remaining tokens and payments to seller
    function claimSeller() external onlyOwner onlyAfterAuctionEnds {
        // Transfer remaining auction tokens back to seller
        FHE.allowTransient(tokensLeft, address(auctionToken));
        auctionToken.confidentialTransfer(seller, tokensLeft);

        // Get current price
        uint64 endPricePerToken = getPrice();

        // Calculate and transfer payment tokens to seller
        euint64 contractAuctionBalance = FHE.mul(endPricePerToken, FHE.sub(FHE.asEuint64(amount), tokensLeft));
        FHE.allowTransient(contractAuctionBalance, address(paymentToken));
        paymentToken.confidentialTransfer(seller, contractAuctionBalance);

        tokensLeft = FHE.asEuint64(0);
        FHE.allowThis(tokensLeft);
        FHE.allow(tokensLeft, owner());
    }

    /// @notice Request decryption of remaining tokens
    /// @dev Only owner can request decryption
    function requestTokensLeftReveal() public onlyOwner {
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(tokensLeft);
        FHE.requestDecryption(cts, this.callbackUint64.selector);
    }

    /// @notice Callback function for 64-bit unsigned integer decryption
    /// @dev Only callable by the Gateway contract
    /// @param decryptedInput The decrypted 64-bit unsigned integer
    /// @return The decrypted value
    function callbackUint64(
        uint256 requestId,
        uint64 decryptedInput,
        bytes[] memory signatures
    ) external returns (uint64) {
        FHE.checkSignatures(requestId, signatures);
        tokensLeftReveal = decryptedInput;
        return decryptedInput;
    }

    /// @notice Cancel the auction and return tokens to seller
    /// @dev Only owner can cancel before auction ends
    function cancelAuction() external onlyOwner onlyBeforeEnd {
        FHE.allowTransient(tokensLeft, address(auctionToken));

        // Refund remaining tokens
        auctionToken.confidentialTransfer(seller, tokensLeft);
    }

    /// @notice Modifier to ensure function is called before auction ends
    /// @dev Reverts if called after the auction end time or if manually stopped
    modifier onlyBeforeEnd() {
        if (!auctionStart) revert AuctionNotStarted();
        if (block.timestamp >= expiresAt || manuallyStopped == true) revert TooLate(expiresAt);
        _;
    }

    /// @notice Modifier to ensure function is called after auction ends
    /// @dev Reverts if called before the auction end time and called after claims time expire and not manually stopped
    modifier onlyAfterAuctionEnds() {
        if (!auctionStart) revert AuctionNotStarted();
        if (block.timestamp < expiresAt && manuallyStopped == false) revert TooEarly(expiresAt);
        _;
    }

    /// @notice Get the user's current bid information
    /// @dev Returns the decrypted values of token amount and paid amount
    /// @return tokenAmount Amount of tokens bid for
    /// @return paidAmount Amount paid for the tokens
    function getUserBid() external view returns (euint64 tokenAmount, euint64 paidAmount) {
        Bid storage userBid = bids[msg.sender];
        return (userBid.tokenAmount, userBid.paidAmount);
    }
}
