import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";

import type { ERC7984Example, PrizeItem, BlindAuction } from "../../types";
import type { ERC7984Example__factory, PrizeItem__factory, BlindAuction__factory } from "../../types";

export async function deployBlindAuctionFixture(owner: HardhatEthersSigner) {
  const [deployer] = await ethers.getSigners();

  // Create Confidential ERC20
  const USDCcFactory = (await ethers.getContractFactory(
    "ERC7984Example",
  )) as ERC7984Example__factory;
  const USDCc = (await USDCcFactory.deploy(0, "USDCc", "USDCc", "")) as ERC7984Example;
  const USDCc_address = await USDCc.getAddress();

  // Create NFT Prize
  const PrizeItemFactory = (await ethers.getContractFactory("PrizeItem")) as PrizeItem__factory;
  const prizeItem = (await PrizeItemFactory.deploy()) as PrizeItem;
  const prizeItem_address = await prizeItem.getAddress();

  // Create a First prize
  const mintTx = await prizeItem.newItem();
  await mintTx.wait();

  const nonce = await deployer.getNonce();

  // Precompute the address of the BlindAuction contract
  const precomputedBlindAuctionAddress = ethers.getCreateAddress({
    from: deployer.address,
    nonce: nonce + 1,
  });

  // Approve it to send it to the Auction
  const approveTx = await prizeItem.approve(precomputedBlindAuctionAddress, 0);
  await approveTx.wait();

  // Contracts are deployed using the first signer/account by default
  const BlindAuctionFactory = (await ethers.getContractFactory("BlindAuction")) as BlindAuction__factory;
  const blindAuction = (await BlindAuctionFactory.deploy(
    prizeItem_address,
    USDCc_address,
    0,
    Math.floor(Date.now() / 1000),
    Math.floor(Date.now() / 1000) + 60 * 60,
  )) as BlindAuction;
  const blindAuction_address = await blindAuction.getAddress();

  return { USDCc, USDCc_address, prizeItem, prizeItem_address, blindAuction, blindAuction_address };
}
