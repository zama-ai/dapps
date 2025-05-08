// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DutchAuctionSellConfERC20NoRefund.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title DutchAuctionFactory
/// @notice A factory contract to create new Dutch auctions
contract DutchAuctionFactory is Ownable2Step {
    constructor() Ownable(msg.sender) {}

    /// @notice List of all created auctions
    address[] public allAuctions;

    /// @notice Emitted when a new auction is created
    /// @param auctionAddress Address of the newly created auction
    event AuctionCreated(address indexed auctionAddress);

    /// @notice Creates a new Dutch auction
    /// @param startingPrice Initial price per token
    /// @param discountRate Rate at which the price decreases
    /// @param token Address of the token being auctioned
    /// @param paymentToken Address of the token used for payment
    /// @param amount Total amount of tokens to auction
    /// @param reservePrice Minimum price per token
    /// @param biddingTime Duration of the auction in seconds
    /// @param isStoppable Whether the auction can be stopped manually
    function createAuction(
        uint64 startingPrice,
        uint64 discountRate,
        ConfidentialERC20 token,
        ConfidentialERC20 paymentToken,
        uint64 amount,
        uint64 reservePrice,
        uint256 biddingTime,
        bool isStoppable
    ) external returns (address) {
        // Deploy new auction with msg.sender as the seller
        DutchAuctionSellingConfidentialERC20NoRefund newAuction = new DutchAuctionSellingConfidentialERC20NoRefund(
            startingPrice,
            discountRate,
            token,
            paymentToken,
            amount,
            reservePrice,
            biddingTime,
            isStoppable,
            msg.sender // Pass the caller's address as the seller
        );
        // Save the address of the new auction
        allAuctions.push(address(newAuction));

        emit AuctionCreated(address(newAuction));

        return address(newAuction);
    }

    /// @notice Returns the number of auctions created
    function getAllAuctionsCount() external view returns (uint256) {
        return allAuctions.length;
    }

    /// @notice Returns the list of all auction addresses
    function getAllAuctions() external view returns (address[] memory) {
        return allAuctions;
    }
}
