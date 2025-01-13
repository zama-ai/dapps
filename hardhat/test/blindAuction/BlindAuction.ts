import { expect } from "chai";
import { ethers } from "hardhat";

import { awaitAllDecryptionResults, initGateway } from "../asyncDecrypt";
import { createInstance } from "../instance";
import { reencryptEuint64, reencryptEuint256 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";
import { deployBlindAuctionFixture } from "./BlindAuction.fixture";
import { deployConfidentialERC20Fixture } from "./ConfidentialERC20.fixture";

describe("BlindAuction", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
    await initGateway();
  });

  beforeEach(async function () {
    // Deploy ERC20 contract with Alice account
    const contractErc20 = await deployConfidentialERC20Fixture();
    this.contractERC20Address = await contractErc20.getAddress();
    this.erc20 = contractErc20;
    this.instance = await createInstance();

    // Mint with Alice account
    const tx1 = await this.erc20.mint(this.signers.alice, 1000);
    tx1.wait();

    // Transfer 100 tokens to Bob
    const input = this.instance.createEncryptedInput(this.contractERC20Address, this.signers.alice.address);
    input.add64(100);
    const encryptedTransferAmount = await input.encrypt();
    const tx = await this.erc20["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );

    // Transfer 100 tokens to Carol
    const tx2 = await this.erc20["transfer(address,bytes32,bytes)"](
      this.signers.carol.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    await Promise.all([tx.wait(), tx2.wait()]);

    // Deploy blind auction
    const blindAuctionContract = await deployBlindAuctionFixture(
      this.signers.alice,
      this.contractERC20Address,
      1000000,
      true,
    );

    this.contractAddress = await blindAuctionContract.getAddress();
    this.blindAuction = blindAuctionContract;
  });

  it.only("should check Carol won the bid", async function () {
    // Create encrypted bid amounts
    const input1 = this.instance.createEncryptedInput(this.contractERC20Address, this.signers.bob.address);
    input1.add64(10);
    const bobBidAmount = await input1.encrypt();

    const input2 = this.instance.createEncryptedInput(this.contractERC20Address, this.signers.carol.address);
    input2.add64(20);
    const carolBidAmount = await input2.encrypt();

    // Approve auction contract to spend tokens
    const txBobApprove = await this.erc20
      .connect(this.signers.bob)
      ["approve(address,bytes32,bytes)"](this.contractAddress, bobBidAmount.handles[0], bobBidAmount.inputProof);
    const txCarolApprove = await this.erc20
      .connect(this.signers.carol)
      ["approve(address,bytes32,bytes)"](this.contractAddress, carolBidAmount.handles[0], carolBidAmount.inputProof);
    await Promise.all([txBobApprove.wait(), txCarolApprove.wait()]);

    // Submit bids
    const input3 = this.instance.createEncryptedInput(this.contractAddress, this.signers.bob.address);
    input3.add64(10);
    const bobBidAmount_auction = await input3.encrypt();

    const txBobBid = await this.blindAuction
      .connect(this.signers.bob)
      .bid(bobBidAmount_auction.handles[0], bobBidAmount_auction.inputProof, { gasLimit: 5000000 });
    txBobBid.wait();

    const input4 = this.instance.createEncryptedInput(this.contractAddress, this.signers.carol.address);
    input4.add64(20);
    const carolBidAmount_auction = await input4.encrypt();

    const txCarolBid = await this.blindAuction
      .connect(this.signers.carol)
      .bid(carolBidAmount_auction.handles[0], carolBidAmount_auction.inputProof, { gasLimit: 5000000 });
    txCarolBid.wait();

    // Stop auction and verify results
    const txAliceStop = await this.blindAuction.connect(this.signers.alice).stop();
    await txAliceStop.wait();

    // Get and verify bids
    const bobBidHandle = await this.blindAuction.getBid(this.signers.bob.address);
    const bobBidDecrypted = await reencryptEuint64(this.signers.bob, this.instance, bobBidHandle, this.contractAddress);
    expect(bobBidDecrypted).to.equal(10);

    const carolBidHandle = await this.blindAuction.getBid(this.signers.carol.address);
    const carolBidDecrypted = await reencryptEuint64(
      this.signers.carol,
      this.instance,
      carolBidHandle,
      this.contractAddress,
    );
    expect(carolBidDecrypted).to.equal(20);

    const bobTicketHandle = await this.blindAuction.ticketUser(this.signers.bob.address);
    const bobTicketDecrypted = await reencryptEuint256(
      this.signers.bob,
      this.instance,
      bobTicketHandle,
      this.contractAddress,
    );
    expect(bobTicketDecrypted).to.not.equal(0);

    const carolTicketHandle = await this.blindAuction.ticketUser(this.signers.carol.address);
    const carolTicketDecrypted = await reencryptEuint256(
      this.signers.carol,
      this.instance,
      carolTicketHandle,
      this.contractAddress,
    );
    expect(carolTicketDecrypted).to.not.equal(0);

    // Decrypt winning ticket and verify winner
    await this.blindAuction.decryptWinningTicket();
    await awaitAllDecryptionResults();
    const winningTicket = await this.blindAuction.getDecryptedWinningTicket();
    expect(winningTicket).to.equal(carolTicketDecrypted);

    // Carol claims and ends auction
    const txCarolClaim = await this.blindAuction.connect(this.signers.carol).claim();
    await txCarolClaim.wait();

    const txCarolWithdraw = await this.blindAuction.connect(this.signers.carol).auctionEnd();
    await txCarolWithdraw.wait();

    // Verify final balances
    const aliceBalanceHandle = await this.erc20.balanceOf(this.signers.alice);
    const aliceBalance = await reencryptEuint64(
      this.signers.alice,
      this.instance,
      aliceBalanceHandle,
      this.contractERC20Address,
    );
    expect(aliceBalance).to.equal(1000 - 100 - 100 + 20);
  });
});
