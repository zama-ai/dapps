// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {FHE, externalEuint64, euint64, eaddress, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ERC7984} from "openzeppelin-confidential-contracts/contracts/token/ERC7984/ERC7984.sol";

/// @title Dutch Auction for Selling Confidential ERC20 Tokens
/// @notice Implements a Dutch auction mechanism for selling confidential ERC20 tokens
/// @dev Uses FHEVM for handling encrypted values and transactions
contract ConfidentialDutchAuction is ZamaEthereumConfig, ReentrancyGuard, Ownable2Step {
    /// @notice The ERC20 token being auctioned
    ERC7984 public immutable auctionToken;
    /// @notice The token used for payments
    ERC7984 public immutable paymentToken;
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

    /// @notice Pending initialization value for decryption
    ebool private _pendingInitValue;

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
    /// @param _paymentToken Address of payment token
    /// @param _amount Amount of tokens being auctioned
    /// @param _reservePrice Minimum price per token
    /// @param _biddingTime Duration of the auction
    /// @param _isStoppable Whether the auction can be manually stopped
    /// @param _seller Address of the seller
    constructor(
        uint64 _startingPrice,
        uint64 _discountRate,
        ERC7984 _token,
        ERC7984 _paymentToken,
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

        amount = _amount;
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
        auctionToken.confidentialTransferFrom(msg.sender, address(this), encAmount);

        euint64 balanceAfter = auctionToken.confidentialBalanceOf(address(this));
        _pendingInitValue = FHE.ge(balanceAfter, amount);
        FHE.allowThis(_pendingInitValue);
        FHE.makePubliclyDecryptable(_pendingInitValue);
    }

    /// @notice Returns the handle for the pending initialization decryption
    function getInitHandle() external view returns (bytes32) {
        return FHE.toBytes32(_pendingInitValue);
    }

    /// @notice Finalizes the initialization after decryption
    /// @param handlesList List of handles that were decrypted
    /// @param cleartexts ABI-encoded decrypted values
    /// @param decryptionProof Proof of valid decryption
    function finalizeInit(
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        auctionStart = abi.decode(cleartexts, (bool));
    }

    /// @notice Gets the current price per token based on time elapsed
    /// @return Current price per token
    function getPrice() public view returns (uint64) {
        uint256 timeElapsed = block.timestamp - startAt;
        if (block.timestamp > expiresAt) {
            timeElapsed = expiresAt - startAt;
        }

        uint256 discount = (discountRate * timeElapsed) / 3600 / 24;
        uint64 currentPrice = startingPrice > uint64(discount) ? startingPrice - uint64(discount) : 0;
        return currentPrice > reservePrice ? currentPrice : reservePrice;
    }

    /// @notice Manually stops the auction
    /// @dev Can only be called by owner if auction is stoppable
    function stop() external onlyOwner {
        require(stoppable);
        manuallyStopped = true;
    }

    /// @notice Places a bid in the auction
    /// @param encryptedValue Encrypted amount of tokens to bid for
    /// @param inputProof Proof for the encrypted input
    function bid(externalEuint64 encryptedValue, bytes calldata inputProof) external onlyBeforeEnd {
        euint64 newTokenAmount = FHE.fromExternal(encryptedValue, inputProof);
        uint64 currentPricePerToken = getPrice();

        newTokenAmount = FHE.min(newTokenAmount, tokensLeft);
        euint64 amountToTransfer = FHE.mul(currentPricePerToken, newTokenAmount);

        euint64 transferredBalance = _handleTransfer(amountToTransfer);
        ebool transferOK = FHE.eq(transferredBalance, amountToTransfer);

        euint64 tokensToTransfer = FHE.select(transferOK, newTokenAmount, FHE.asEuint64(0));
        _handleTokenTransfer(tokensToTransfer);

        _updateBidInfo(tokensToTransfer, transferredBalance);

        emit BidSubmitted(msg.sender, currentPricePerToken);
    }

    /// @dev Handles the transfer of payment tokens from bidder to contract
    function _handleTransfer(euint64 amountToTransfer) private returns (euint64) {
        euint64 balanceBefore = paymentToken.confidentialBalanceOf(address(this));
        FHE.allowTransient(amountToTransfer, address(paymentToken));
        paymentToken.confidentialTransferFrom(msg.sender, address(this), amountToTransfer);
        euint64 balanceAfter = paymentToken.confidentialBalanceOf(address(this));
        return FHE.sub(balanceAfter, balanceBefore);
    }

    /// @dev Handles refund of payment tokens to bidder
    function _handleRefund(euint64 amountToTransfer) private {
        FHE.allowTransient(amountToTransfer, address(paymentToken));
        paymentToken.confidentialTransfer(msg.sender, amountToTransfer);
    }

    /// @dev Handles transfer of auction tokens to bidder
    function _handleTokenTransfer(euint64 amountToTransfer) private {
        FHE.allowTransient(amountToTransfer, address(auctionToken));
        auctionToken.confidentialTransfer(msg.sender, amountToTransfer);
    }

    /// @dev Updates the bid information for a bidder
    function _updateBidInfo(euint64 newTokenAmount, euint64 newPaidAmount) private {
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

        tokensLeft = FHE.sub(tokensLeft, newTokenAmount);
        FHE.allowThis(tokensLeft);
        FHE.allow(tokensLeft, owner());
    }

    /// @notice Claims the refund for a user after auction ends
    /// @dev Refunds the difference between paid amount and final price
    function claimUserRefund() external onlyAfterAuctionEnds {
        Bid storage userBid = bids[msg.sender];

        uint64 finalPrice = getPrice();
        euint64 finalPricePerToken = FHE.asEuint64(finalPrice);
        euint64 finalCost = FHE.mul(finalPricePerToken, userBid.tokenAmount);
        euint64 refundAmount = FHE.sub(userBid.paidAmount, finalCost);

        _handleRefund(refundAmount);
        delete bids[msg.sender];
    }

    /// @notice Claims the proceeds for the seller after auction ends
    /// @dev Transfers remaining tokens and payment to seller
    function claimSeller() external onlyOwner onlyAfterAuctionEnds {
        FHE.allowTransient(tokensLeft, address(auctionToken));
        auctionToken.confidentialTransfer(seller, tokensLeft);

        uint64 endPricePerToken = getPrice();
        euint64 contractAuctionBalance = FHE.mul(endPricePerToken, FHE.sub(FHE.asEuint64(amount), tokensLeft));
        FHE.allowTransient(contractAuctionBalance, address(paymentToken));
        paymentToken.confidentialTransfer(seller, contractAuctionBalance);

        tokensLeft = FHE.asEuint64(0);
        FHE.allowThis(tokensLeft);
        FHE.allow(tokensLeft, owner());
    }

    /// @notice Requests decryption of tokens left in the auction
    function requestTokensLeftReveal() public onlyOwner {
        FHE.makePubliclyDecryptable(tokensLeft);
    }

    /// @notice Returns the handle for tokens left decryption
    function getTokensLeftHandle() external view returns (bytes32) {
        return FHE.toBytes32(tokensLeft);
    }

    /// @notice Finalizes the tokens left reveal after decryption
    /// @param handlesList List of handles that were decrypted
    /// @param cleartexts ABI-encoded decrypted values
    /// @param decryptionProof Proof of valid decryption
    function finalizeTokensLeftReveal(
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        tokensLeftReveal = abi.decode(cleartexts, (uint64));
    }

    /// @notice Cancels the auction and returns tokens to seller
    /// @dev Can only be called by owner before auction ends
    function cancelAuction() external onlyOwner onlyBeforeEnd {
        FHE.allowTransient(tokensLeft, address(auctionToken));
        auctionToken.confidentialTransfer(seller, tokensLeft);
    }

    /// @dev Modifier to restrict function calls to before auction end
    modifier onlyBeforeEnd() {
        if (!auctionStart) revert AuctionNotStarted();
        if (block.timestamp >= expiresAt || manuallyStopped == true) revert TooLate(expiresAt);
        _;
    }

    /// @dev Modifier to restrict function calls to after auction end
    modifier onlyAfterAuctionEnds() {
        if (!auctionStart) revert AuctionNotStarted();
        if (block.timestamp < expiresAt && manuallyStopped == false) revert TooEarly(expiresAt);
        _;
    }

    /// @notice Gets the bid information for a user
    /// @return tokenAmount Amount of tokens bid for
    /// @return paidAmount Amount paid for the tokens
    function getUserBid() external view returns (euint64 tokenAmount, euint64 paidAmount) {
        Bid storage userBid = bids[msg.sender];
        return (userBid.tokenAmount, userBid.paidAmount);
    }
}
