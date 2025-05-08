import { expect } from "chai";
import { ethers } from "hardhat";

import { awaitAllDecryptionResults, initGateway } from "../asyncDecrypt";
import { createInstance } from "../instance";
import { reencryptEuint64 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";

describe("DutchAuctionFactory", function () {
  const STARTING_PRICE = 10n; // starting price for 1 token // 0.00001 ETH
  const DISCOUNT_RATE = 1n;
  const TOKEN_AMOUNT = 1000n;
  const WETH_AMOUNT = 10000n; // 0.01 ETH
  const RESERVE_PRICE = 1n;
  const STOPPABLE = true;
  const DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

  before(async function () {
    await initSigners();
    this.signers = await getSigners();
    await initGateway();
  });

  beforeEach(async function () {
    // Deploy the token contracts
    const ConfTokenFactory = await ethers.getContractFactory("MyConfidentialERC20");
    this.auctionToken = await ConfTokenFactory.connect(this.signers.alice).deploy("AuctionToken", "AT");
    this.paymentToken = await ConfTokenFactory.connect(this.signers.alice).deploy("PaymentToken", "PT");
    await this.auctionToken.waitForDeployment();
    await this.paymentToken.waitForDeployment();

    // Mint tokens for Alice (auction token) and Bob (payment token)
    const tx = await this.auctionToken.mint(this.signers.alice, TOKEN_AMOUNT); // minting 10000 auction tokens to ALICE
    const t1 = await tx.wait();
    expect(t1?.status).to.eq(1);

    const tx2 = await this.paymentToken.mint(this.signers.bob, WETH_AMOUNT); // minting 10000 usdc to BOB
    const t2 = await tx2.wait();
    expect(t2?.status).to.eq(1);

    this.instance = await createInstance();

    // Deploy the factory contract
    const Factory = await ethers.getContractFactory("DutchAuctionFactory");
    this.factory = await Factory.connect(this.signers.alice).deploy();
    await this.factory.waitForDeployment();
  });

  describe("Factory Deployment", function () {
    it("Should deploy the factory contract correctly", async function () {
      expect(this.factory).to.not.be.undefined;
    });

    it("Should have no auctions at the beginning", async function () {
      const count = await this.factory.getAllAuctionsCount();
      expect(count).to.equal(0);
    });
  });

  describe("Create Auction", function () {
    it("Should allow creating a new auction", async function () {
      const tx = await this.factory
        .connect(this.signers.alice)
        .createAuction(
          STARTING_PRICE,
          DISCOUNT_RATE,
          this.auctionToken.getAddress(),
          this.paymentToken.getAddress(),
          TOKEN_AMOUNT,
          RESERVE_PRICE,
          DURATION,
          STOPPABLE,
        );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const count = await this.factory.getAllAuctionsCount();
      expect(count).to.equal(1);

      const auctions = await this.factory.getAllAuctions();
      expect(auctions.length).to.equal(1);

      console.log(`Auction created at: ${auctions[0]}`);
    });

    it("Should emit an event when an auction is created", async function () {
      await expect(
        this.factory
          .connect(this.signers.alice)
          .createAuction(
            STARTING_PRICE,
            DISCOUNT_RATE,
            this.auctionToken.getAddress(),
            this.paymentToken.getAddress(),
            TOKEN_AMOUNT,
            RESERVE_PRICE,
            DURATION,
            STOPPABLE,
          ),
      ).to.emit(this.factory, "AuctionCreated");
    });

    it("Should store auction details correctly", async function () {
      const tx = await this.factory
        .connect(this.signers.bob)
        .createAuction(
          STARTING_PRICE,
          DISCOUNT_RATE,
          this.auctionToken.getAddress(),
          this.paymentToken.getAddress(),
          TOKEN_AMOUNT,
          RESERVE_PRICE,
          DURATION,
          STOPPABLE,
        );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      const auctionAddress = (await this.factory.getAllAuctions())[0];
      const auction = await ethers.getContractAt("DutchAuctionSellingConfidentialERC20NoRefund", auctionAddress);

      // Verify all auction parameters
      expect(await auction.owner()).to.equal(this.signers.bob.address);
      expect(await auction.startingPrice()).to.equal(STARTING_PRICE);
      expect(await auction.discountRate()).to.equal(DISCOUNT_RATE);
      expect(await auction.reservePrice()).to.equal(RESERVE_PRICE);
      expect(await auction.amount()).to.equal(TOKEN_AMOUNT);
      expect(await auction.auctionToken()).to.equal(await this.auctionToken.getAddress());
      expect(await auction.paymentToken()).to.equal(await this.paymentToken.getAddress());
      expect((await auction.expiresAt()) - (await auction.startAt())).to.equal(DURATION);
      expect(await auction.stoppable()).to.equal(STOPPABLE);
    });

    it("Should not allow starting price lower than minimum requirement", async function () {
      await expect(
        this.factory.connect(this.signers.alice).createAuction(
          RESERVE_PRICE, // Lower than required
          DISCOUNT_RATE,
          this.auctionToken.getAddress(),
          this.paymentToken.getAddress(),
          TOKEN_AMOUNT,
          RESERVE_PRICE,
          DURATION,
          STOPPABLE,
        ),
      ).to.be.reverted;
    });

    it("Should reject auction with zero reserve price", async function () {
      await expect(
        this.factory.connect(this.signers.alice).createAuction(
          STARTING_PRICE,
          DISCOUNT_RATE,
          this.auctionToken.getAddress(),
          this.paymentToken.getAddress(),
          TOKEN_AMOUNT,
          0, // Invalid reserve price
          DURATION,
          STOPPABLE,
        ),
      ).to.be.reverted;
    });

    it("Should reject if starting price is not greater than reserve price", async function () {
      await expect(
        this.factory.connect(this.signers.alice).createAuction(
          RESERVE_PRICE, // Same as reserve price
          DISCOUNT_RATE,
          this.auctionToken.getAddress(),
          this.paymentToken.getAddress(),
          TOKEN_AMOUNT,
          RESERVE_PRICE,
          DURATION,
          STOPPABLE,
        ),
      ).to.be.reverted;
    });

    it("Should create auction, initialize it and accept first bid", async function () {
      // Create auction through factory
      const tx = await this.factory
        .connect(this.signers.alice)
        .createAuction(
          STARTING_PRICE,
          DISCOUNT_RATE,
          await this.auctionToken.getAddress(),
          await this.paymentToken.getAddress(),
          TOKEN_AMOUNT,
          RESERVE_PRICE,
          DURATION,
          STOPPABLE,
        );
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Get deployed auction address and create contract instance
      const auctions = await this.factory.getAllAuctions();
      const auction = await ethers.getContractAt("DutchAuctionSellingConfidentialERC20NoRefund", auctions[0]);

      // Create encrypted input for auction token approval
      const input1 = this.instance.createEncryptedInput(
        await this.auctionToken.getAddress(),
        this.signers.alice.address,
      );
      input1.add64(TOKEN_AMOUNT);
      const aliceTokenAmount = await input1.encrypt();

      // Approve auction contract to spend tokens
      const txAliceApprove = await this.auctionToken
        .connect(this.signers.alice)
        ["approve(address,bytes32,bytes)"](auctions[0], aliceTokenAmount.handles[0], aliceTokenAmount.inputProof);
      await txAliceApprove.wait();

      // Initialize the auction
      const txInit = await auction.connect(this.signers.alice).initialize();
      await txInit.wait();

      // Wait for decryption
      await awaitAllDecryptionResults();

      // Approve payment token for Bob
      const input = this.instance.createEncryptedInput(await this.paymentToken.getAddress(), this.signers.bob.address);
      input.add64(WETH_AMOUNT);
      const bobPaymentAmount = await input.encrypt();

      const txBobApprove = await this.paymentToken
        .connect(this.signers.bob)
        ["approve(address,bytes32,bytes)"](auctions[0], bobPaymentAmount.handles[0], bobPaymentAmount.inputProof);
      await txBobApprove.wait();

      // Create and place bid
      const bidAmount = 100n;
      const bidInput = this.instance.createEncryptedInput(auctions[0], this.signers.bob.address);
      bidInput.add64(bidAmount);
      const encryptedBid = await bidInput.encrypt();

      // Place bid
      await expect(auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof)).to.not.be
        .reverted;

      // Verify bid was recorded
      const [bidTokens] = await auction.connect(this.signers.bob).getUserBid();
      const decryptedBidTokens = await reencryptEuint64(this.signers.bob, this.instance, bidTokens, auctions[0]);
      expect(decryptedBidTokens).to.equal(bidAmount);
    });
  });

  describe("Auction List", function () {
    beforeEach(async function () {
      // Create two auctions
      await this.factory
        .connect(this.signers.alice)
        .createAuction(
          STARTING_PRICE,
          DISCOUNT_RATE,
          this.auctionToken.getAddress(),
          this.paymentToken.getAddress(),
          TOKEN_AMOUNT,
          RESERVE_PRICE,
          DURATION,
          STOPPABLE,
        );

      await this.factory
        .connect(this.signers.alice)
        .createAuction(
          STARTING_PRICE + 5n,
          DISCOUNT_RATE,
          this.auctionToken.getAddress(),
          this.paymentToken.getAddress(),
          TOKEN_AMOUNT,
          RESERVE_PRICE,
          DURATION,
          STOPPABLE,
        );
    });

    it("Should return correct number of auctions", async function () {
      const count = await this.factory.getAllAuctionsCount();
      expect(count).to.equal(2);
    });

    it("Should return correct list of auction addresses", async function () {
      const auctions = await this.factory.getAllAuctions();
      expect(auctions.length).to.equal(2);
    });

    it("Should allow tracking multiple auctions", async function () {
      const auctions = await this.factory.getAllAuctions();
      const auction1 = await ethers.getContractAt("DutchAuctionSellingConfidentialERC20NoRefund", auctions[0]);
      const auction2 = await ethers.getContractAt("DutchAuctionSellingConfidentialERC20NoRefund", auctions[1]);

      expect(await auction1.startingPrice()).to.equal(STARTING_PRICE);
      expect(await auction2.startingPrice()).to.equal(STARTING_PRICE + 5n);
    });
  });
});
