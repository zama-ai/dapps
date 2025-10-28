// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, externalEuint64, euint64, eaddress, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ConfidentialFungibleToken} from "@openzeppelin/confidential-contracts/token/ConfidentialFungibleToken.sol";

contract BlindAuction is SepoliaConfig, ReentrancyGuard {
    /// @notice The recipient of the highest bid once the auction ends
    address public beneficiary;

    /// @notice Confidenctial Payment Token
    ConfidentialFungibleToken public confidentialFungibleToken;

    /// @notice Token for the auction
    IERC721 public nftContract;
    uint256 public tokenId;

    /// @notice Auction duration
    uint256 public auctionStartTime;
    uint256 public auctionEndTime;

    /// @notice Encrypted auction info
    euint64 private highestBid;
    eaddress private winningAddress;

    /// @notice Winner address defined at the end of the auction
    address public winnerAddress;

    /// @notice Indicate if the NFT of the auction has been claimed
    bool public isNftClaimed;

    /// @notice Request ID used for decryption
    uint256 internal _decryptionRequestId;

    /// @notice Mapping from bidder to their bid value
    mapping(address account => euint64 bidAmount) private bids;

    // ========== Errors ==========

    /// @notice Error thrown when a function is called too early
    /// @dev Includes the time when the function can be called
    error TooEarlyError(uint256 time);

    /// @notice Error thrown when a function is called too late
    /// @dev Includes the time after which the function cannot be called
    error TooLateError(uint256 time);

    /// @notice Thrown when attempting an action that requires the winner to be resolved
    /// @dev Indicates the winner has not yet been decrypted
    error WinnerNotYetRevealed();

    // ========== Modifiers ==========

    /// @notice Modifier to ensure function is called before auction ends.
    /// @dev Reverts if called after the auction end time.
    modifier onlyDuringAuction() {
        if (block.timestamp < auctionStartTime) revert TooEarlyError(auctionStartTime);
        if (block.timestamp >= auctionEndTime) revert TooLateError(auctionEndTime);
        _;
    }

    /// @notice Modifier to ensure function is called after auction ends.
    /// @dev Reverts if called before the auction end time.
    modifier onlyAfterEnd() {
        if (block.timestamp < auctionEndTime) revert TooEarlyError(auctionEndTime);
        _;
    }

    /// @notice Modifier to ensure function is called when the winner is revealed.
    /// @dev Reverts if called before the winner is revealed.
    modifier onlyAfterWinnerRevealed() {
        if (winnerAddress == address(0)) revert WinnerNotYetRevealed();
        _;
    }

    // ========== Views ==========

    function getEncryptedBid(address account) external view returns (euint64) {
        return bids[account];
    }

    /// @notice Get the winning address when the auction is ended
    /// @dev Can only be called after the winning address has been decrypted
    /// @return winnerAddress The decrypted winning address
    function getWinnerAddress() external view returns (address) {
        require(winnerAddress != address(0), "Winning address has not been decided yet");
        return winnerAddress;
    }

    constructor(
        address _nftContractAddress,
        address _confidentialFungibleTokenAddress,
        uint256 _tokenId,
        uint256 _auctionStartTime,
        uint256 _auctionEndTime
    ) {
        beneficiary = msg.sender;
        confidentialFungibleToken = ConfidentialFungibleToken(_confidentialFungibleTokenAddress);
        nftContract = IERC721(_nftContractAddress);

        // Transfer the NFT to the contract for the auction
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        require(_auctionStartTime < _auctionEndTime, "INVALID_TIME");
        auctionStartTime = _auctionStartTime;
        auctionEndTime = _auctionEndTime;
    }

    function bid(externalEuint64 encryptedAmount, bytes calldata inputProof) public onlyDuringAuction nonReentrant {
        // Get and verify the amount from the user
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Transfer the confidential token as payment
        euint64 balanceBefore = confidentialFungibleToken.confidentialBalanceOf(address(this));
        FHE.allowTransient(amount, address(confidentialFungibleToken));
        confidentialFungibleToken.confidentialTransferFrom(msg.sender, address(this), amount);
        euint64 balanceAfter = confidentialFungibleToken.confidentialBalanceOf(address(this));
        euint64 sentBalance = FHE.sub(balanceAfter, balanceBefore);

        // Need to update the bid balance
        euint64 previousBid = bids[msg.sender];
        if (FHE.isInitialized(previousBid)) {
            // The user increase his bid
            euint64 newBid = FHE.add(previousBid, sentBalance);
            bids[msg.sender] = newBid;
        } else {
            // First bid for the user
            bids[msg.sender] = sentBalance;
        }

        // Compare the total value of the user from the highest bid
        euint64 currentBid = bids[msg.sender];
        FHE.allowThis(currentBid);
        FHE.allow(currentBid, msg.sender);

        if (FHE.isInitialized(highestBid)) {
            ebool isNewWinner = FHE.lt(highestBid, currentBid);
            highestBid = FHE.select(isNewWinner, currentBid, highestBid);
            winningAddress = FHE.select(isNewWinner, FHE.asEaddress(msg.sender), winningAddress);
        } else {
            highestBid = currentBid;
            winningAddress = FHE.asEaddress(msg.sender);
        }
        FHE.allowThis(highestBid);
        FHE.allowThis(winningAddress);
    }

    /// @notice Initiate the decryption of the winning address
    /// @dev Can only be called after the auction ends
    function decryptWinningAddress() public onlyAfterEnd {
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(winningAddress);
        _decryptionRequestId = FHE.requestDecryption(cts, this.resolveAuctionCallback.selector);
    }

    /// @notice Claim the NFT prize.
    /// @dev Only the winner can call this function when the auction is ended.
    function winnerClaimPrize() public onlyAfterWinnerRevealed {
        require(winnerAddress == msg.sender, "Only winner can claim item");
        require(!isNftClaimed, "NFT has already been claimed");
        isNftClaimed = true;

        // Reset bid value
        bids[msg.sender] = FHE.asEuint64(0);
        FHE.allowThis(bids[msg.sender]);
        FHE.allow(bids[msg.sender], msg.sender);

        // Transfer the highest bid to the beneficiary
        FHE.allowTransient(highestBid, address(confidentialFungibleToken));
        confidentialFungibleToken.confidentialTransfer(beneficiary, highestBid);

        // Send the NFT to the winner
        nftContract.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    /// @notice Withdraw a bid from the auction
    /// @dev Can only be called after the auction ends and by non-winning bidders
    function withdraw(address bidder) public onlyAfterWinnerRevealed {
        if (bidder == winnerAddress) revert TooLateError(auctionEndTime);

        // Get the user bid value
        euint64 amount = bids[bidder];
        FHE.allowTransient(amount, address(confidentialFungibleToken));

        // Reset user bid value
        euint64 newBid = FHE.asEuint64(0);
        bids[bidder] = newBid;
        FHE.allowThis(newBid);
        FHE.allow(newBid, bidder);

        // Refund the user with his bid amount
        confidentialFungibleToken.confidentialTransfer(bidder, amount);
    }

    // ========== Oracle Callback ==========

    /// @notice Callback function to set the decrypted winning address
    /// @dev Can only be called by the Gateway
    /// @param requestID Request Id created by the Oracle.
    /// @param cleartexts Cleartexts of the decrypted data.
    /// @param decryptionProof Proof of the decryption.
    function resolveAuctionCallback(
        uint256 requestID,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) public {
        require(requestID == _decryptionRequestId, "Invalid requestId");
        FHE.checkSignatures(requestID, cleartexts, decryptionProof);

        (address resultWinnerAddress) = abi.decode(cleartexts, (address));


        winnerAddress = resultWinnerAddress;
    }
}
