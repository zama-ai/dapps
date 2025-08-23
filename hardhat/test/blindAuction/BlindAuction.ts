import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import * as hre from "hardhat";

type Signers = {
  owner: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

import { deployBlindAuctionFixture } from "./BlindAuction.fixture";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ConfidentialERC20", function () {
  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
    this.signers = {} as Signers;

    const signers = await ethers.getSigners();
    this.signers.owner = signers[0];
    this.signers.alice = signers[1];
    this.signers.bob = signers[2];
  });

  beforeEach(async function () {
    const deployment = await deployBlindAuctionFixture(this.signers.owner);

    this.USDCc = deployment.USDCc;
    this.prizeItem = deployment.prizeItem;
    this.blindAuction = deployment.blindAuction;

    this.USDCcAddress = deployment.USDCc_address;
    this.prizeItemAddress = deployment.prizeItem_address;
    this.blindAuctionAddress = deployment.blindAuction_address;

    this.getUSDcBalance = async (signer: HardhatEthersSigner) => {
      const encryptedBalance = await this.USDCc.confidentialBalanceOf(signer.address);
      return await hre.fhevm.userDecryptEuint(FhevmType.euint64, encryptedBalance, this.USDCcAddress, signer);
    };

    this.encryptBid = async (targetContract: string, userAddress: string, amount: number) => {
      const bidInput = hre.fhevm.createEncryptedInput(targetContract, userAddress);
      bidInput.add64(amount);
      return await bidInput.encrypt();
    };

    this.approve = async (signer: HardhatEthersSigner) => {
      // Approve to send the fund
      const approveTx = await this.USDCc.connect(signer)["setOperator(address, uint48)"](
        this.blindAuctionAddress,
        Math.floor(Date.now() / 1000) + 60 * 60,
      );
      await approveTx.wait();
    };

    this.bid = async (signer: HardhatEthersSigner, amount: number) => {
      const encryptedBid = await this.encryptBid(this.blindAuctionAddress, signer.address, amount);
      const bidTx = await this.blindAuction.connect(signer).bid(encryptedBid.handles[0], encryptedBid.inputProof);
      await bidTx.wait();
    };

    this.mintUSDc = async (signer: HardhatEthersSigner, amount: number) => {
      // Use the simpler mint function that doesn't require FHE encryption
      const mintTx = await this.USDCc.mint(signer.address, amount);
      await mintTx.wait();
    };
  });

  it("should mint confidential USDC", async function () {
    const aliceSigner = this.signers.alice;
    const aliceAddress = aliceSigner.address;

    // Check initial balance
    const initialEncryptedBalance = await this.USDCc.confidentialBalanceOf(aliceAddress);
    console.log("Initial encrypted balance:", initialEncryptedBalance);

    // Mint some confidential USDC
    await this.mintUSDc(aliceSigner, 1_000_000);

    // Check balance after minting
    const finalEncryptedBalance = await this.USDCc.confidentialBalanceOf(aliceAddress);
    console.log("Final encrypted balance:", finalEncryptedBalance);

    // The balance should be different (not zero)
    expect(finalEncryptedBalance).to.not.equal(initialEncryptedBalance);
  });

  it("should place an encrypted bid", async function () {
    const aliceSigner = this.signers.alice;
    const aliceAddress = aliceSigner.address;

    // Mint some confidential USDC
    await this.mintUSDc(aliceSigner, 1_000_000);

    // Bid amount
    const bidAmount = 10_000;

    await this.approve(aliceSigner);
    await this.bid(aliceSigner, bidAmount);

    // Check payment transfer
    const aliceEncryptedBalance = await this.USDCc.confidentialBalanceOf(aliceAddress);
    const aliceClearBalance = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceEncryptedBalance,
      this.USDCcAddress,
      aliceSigner,
    );
    expect(aliceClearBalance).to.equal(1_000_000 - bidAmount);

    // Check bid value
    const aliceEncryptedBid = await this.blindAuction.getEncryptedBid(aliceAddress);
    const aliceClearBid = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      aliceEncryptedBid,
      this.blindAuctionAddress,
      aliceSigner,
    );
    expect(aliceClearBid).to.equal(bidAmount);
  });

  it("bob should win auction", async function () {
    const aliceSigner = this.signers.alice;
    const bobSigner = this.signers.bob;
    const beneficiary = this.signers.owner;

    // Mint some confidential USDC
    await this.mintUSDc(aliceSigner, 1_000_000);
    await this.mintUSDc(bobSigner, 1_000_000);

    // Alice bid
    await this.approve(aliceSigner);
    await this.bid(aliceSigner, 10_000);

    // Bob bid
    await this.approve(bobSigner);
    await this.bid(bobSigner, 15_000);

    // Wait end auction
    await time.increase(3600);

    await this.blindAuction.decryptWinningAddress();
    await hre.fhevm.awaitDecryptionOracle();

    // Verify the winner
    expect(await this.blindAuction.getWinnerAddress()).to.be.equal(bobSigner.address);

    // Bob cannot withdraw any money
    await expect(this.blindAuction.withdraw(bobSigner.address)).to.be.reverted;

    // Claimed NFT Item
    expect(await this.prizeItem.ownerOf(await this.blindAuction.tokenId())).to.be.equal(this.blindAuctionAddress);
    await this.blindAuction.connect(bobSigner).winnerClaimPrize();
    expect(await this.prizeItem.ownerOf(await this.blindAuction.tokenId())).to.be.equal(bobSigner.address);

    // Refund user
    const aliceBalanceBefore = await this.getUSDcBalance(aliceSigner);
    await this.blindAuction.withdraw(aliceSigner.address);
    const aliceBalanceAfter = await this.getUSDcBalance(aliceSigner);
    expect(aliceBalanceAfter).to.be.equal(aliceBalanceBefore + 10_000n);

    // Bob cannot withdraw any money
    await expect(this.blindAuction.withdraw(bobSigner.address)).to.be.reverted;

    // Check beneficiary balance
    const beneficiaryBalance = await this.getUSDcBalance(beneficiary);
    expect(beneficiaryBalance).to.be.equal(15_000);
  });
});
