// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract PrizeItem is ERC721 {
    uint256 private _nextTokenId;

    constructor() ERC721("AuctionItem", "AIT") {}

    function newItem() public returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);
        return tokenId;
    }
}
