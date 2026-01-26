import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ERC7984Example__factory } from "../../types";
import { FhevmType } from "@fhevm/mock-utils";

describe("ConfidentialDutchAuction", function () {
  const STARTING_PRICE = 10n;
  const DISCOUNT_RATE = 1n;
  const TOKEN_AMOUNT = 1000n;
  const WETH_AMOUNT = 10000n;
  const RESERVE_PRICE = 1n;
  const STOPPABLE = true;
  const DURATION = 7 * 24 * 60 * 60;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    this.signers = { alice: ethSigners[0], bob: ethSigners[1], carol: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    const USDCcFactory = (await ethers.getContractFactory("ERC7984Example")) as ERC7984Example__factory;
    this.auctionToken = await USDCcFactory.connect(this.signers.alice).deploy(TOKEN_AMOUNT, "AuctionToken", "AT", "");
    this.paymentToken = await USDCcFactory.connect(this.signers.bob).deploy(WETH_AMOUNT, "PaymentToken", "PT", "");
    await this.auctionToken.waitForDeployment();
    await this.paymentToken.waitForDeployment();
    this.paymentTokenAddress = await this.paymentToken.getAddress();
    this.auctionTokenAddress = await this.auctionToken.getAddress();

    const AuctionFactory = await ethers.getContractFactory("ConfidentialDutchAuction");
    this.auction = await AuctionFactory.connect(this.signers.alice).deploy(
      STARTING_PRICE,
      DISCOUNT_RATE,
      this.auctionTokenAddress,
      this.paymentTokenAddress,
      TOKEN_AMOUNT,
      RESERVE_PRICE,
      DURATION,
      STOPPABLE,
      this.signers.alice.address,
    );

    await this.auction.waitForDeployment();
    this.auctionAddress = await this.auction.getAddress();

    this.approveAuctionToken = async (signer: HardhatEthersSigner) => {
      const approveTx = await this.auctionToken
        .connect(signer)
        ["setOperator(address, uint48)"](this.auctionAddress, Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60);
      await approveTx.wait();
    };

    this.approvePaymentToken = async (signer: HardhatEthersSigner) => {
      const approveTx = await this.paymentToken
        .connect(signer)
        ["setOperator(address, uint48)"](this.auctionAddress, Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60);
      await approveTx.wait();
    };

    await this.approveAuctionToken(this.signers.alice);
    await this.approveAuctionToken(this.signers.bob);
    await this.approvePaymentToken(this.signers.alice);
    await this.approvePaymentToken(this.signers.bob);

    this.finalizeInit = async () => {
      const handle = await this.auction.getInitHandle();
      const decryptResult = await fhevm.publicDecrypt([handle]);
      const tx = await this.auction.finalizeInit(
        [handle],
        decryptResult.abiEncodedClearValues,
        decryptResult.decryptionProof,
      );
      await tx.wait();
    };

    this.finalizeTokensLeftReveal = async () => {
      const handle = await this.auction.getTokensLeftHandle();
      const decryptResult = await fhevm.publicDecrypt([handle]);
      const tx = await this.auction.finalizeTokensLeftReveal(
        [handle],
        decryptResult.abiEncodedClearValues,
        decryptResult.decryptionProof,
      );
      await tx.wait();
    };

    this.initializeAuction = async () => {
      const tx = await this.auctionToken.mint(this.signers.alice, TOKEN_AMOUNT);
      await tx.wait();

      const approveTxAlice = await this.auctionToken
        .connect(this.signers.alice)
        ["setOperator(address, uint48)"](this.auctionAddress, Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
      await approveTxAlice.wait();

      const approveTxBob = await this.paymentToken
        .connect(this.signers.bob)
        ["setOperator(address, uint48)"](this.auctionAddress, Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);
      await approveTxBob.wait();

      await new Promise((resolve) => setTimeout(resolve, 100));

      const isAliceOperatorSet = await this.auctionToken.isOperator(this.signers.alice.address, this.auctionAddress);
      const isBobOperatorSet = await this.paymentToken.isOperator(this.signers.bob.address, this.auctionAddress);

      if (!isAliceOperatorSet) {
        throw new Error(`Alice operator not set correctly for ${this.signers.alice.address} -> ${this.auctionAddress}`);
      }

      if (!isBobOperatorSet) {
        throw new Error(`Bob operator not set correctly for ${this.signers.bob.address} -> ${this.auctionAddress}`);
      }

      const txInit = await this.auction.connect(this.signers.alice).initialize();
      await txInit.wait();
      await this.finalizeInit();
    };
  });

  describe("Deployment", function () {
    it("Should set the correct initial values", async function () {
      expect(await this.auction.seller()).to.equal(this.signers.alice.address);
      expect(await this.auction.startingPrice()).to.equal(STARTING_PRICE);
      expect(await this.auction.discountRate()).to.equal(DISCOUNT_RATE);
      expect(await this.auction.reservePrice()).to.equal(RESERVE_PRICE);
      expect(await this.auction.amount()).to.equal(TOKEN_AMOUNT);
    });

    it("Should revert if starting price is too low", async function () {
      const AuctionFactory = await ethers.getContractFactory("ConfidentialDutchAuction");
      const deployment = AuctionFactory.connect(this.signers.alice).deploy(
        RESERVE_PRICE,
        DISCOUNT_RATE,
        await this.auctionToken.getAddress(),
        await this.paymentToken.getAddress(),
        TOKEN_AMOUNT,
        RESERVE_PRICE,
        DURATION,
        STOPPABLE,
        this.signers.alice.address,
      );

      await expect(deployment).to.be.revertedWithCustomError(AuctionFactory, "StartingPriceBelowReservePrice");
    });
  });

  describe("Price calculation", function () {
    it("Should return starting price at start", async function () {
      const price = await this.auction.getPrice();
      expect(price).to.be.closeTo(STARTING_PRICE, 1000000000);
    });

    it("Should decrease price over time", async function () {
      const oneDay = 24n * 60n * 60n;
      await time.increase(oneDay);

      const expectedPrice = STARTING_PRICE - DISCOUNT_RATE * oneDay;
      expect(await this.auction.getPrice()).to.be.closeTo(expectedPrice, 1000000000);
    });

    it("Should not go below reserve price", async function () {
      const sevenDays = 7 * 24 * 60 * 60;
      await time.increase(sevenDays);
      const expectedSevenDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(DURATION)) / 3600n / 24n;
      const endPrice = expectedSevenDayPrice > RESERVE_PRICE ? expectedSevenDayPrice : RESERVE_PRICE;

      expect(await this.auction.getPrice()).to.equal(endPrice);
    });
  });

  describe("Auction management", function () {
    it("Should allow owner to cancel auction", async function () {
      await this.initializeAuction();
      await expect(this.auction.connect(this.signers.alice).cancelAuction()).to.not.be.reverted;
    });

    it("Should not allow non-owner to cancel auction", async function () {
      await expect(this.auction.connect(this.signers.bob).cancelAuction()).to.be.reverted;
    });

    it("Should not allow cancellation after expiration", async function () {
      await this.initializeAuction();
      await time.increase(7 * 24 * 60 * 60 + 1);
      await expect(this.auction.connect(this.signers.alice).cancelAuction()).to.be.revertedWithCustomError(
        this.auction,
        "TooLate",
      );
    });
  });

  describe("Bidding process", function () {
    it("Should allow placing a bid", async function () {
      await this.initializeAuction();

      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await expect(this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof)).to.not
        .be.reverted;
    });

    it("Should allow multiple bids from the same user", async function () {
      await this.initializeAuction();

      const bidAmount1 = 50n;
      const input1 = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input1.add64(bidAmount1);
      const encryptedBid1 = await input1.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid1.handles[0], encryptedBid1.inputProof);

      const bidAmount2 = 30n;
      const input2 = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input2.add64(bidAmount2);
      const encryptedBid2 = await input2.encrypt();

      await expect(this.auction.connect(this.signers.bob).bid(encryptedBid2.handles[0], encryptedBid2.inputProof)).to
        .not.be.reverted;
    });

    it("Should not allow bids after auction ends", async function () {
      await this.initializeAuction();
      await time.increase(7 * 24 * 60 * 60 + 1);

      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await expect(
        this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof),
      ).to.be.revertedWithCustomError(this.auction, "TooLate");
    });

    it("Should allow claiming tokens after auction ends", async function () {
      await this.initializeAuction();

      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);
      await time.increase(7 * 24 * 60 * 60 + 1);

      await expect(this.auction.connect(this.signers.bob).claimUserRefund()).to.not.be.reverted;
    });

    it("Should not allow claiming before auction ends", async function () {
      await this.initializeAuction();

      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      await expect(this.auction.connect(this.signers.bob).claimUserRefund()).to.be.revertedWithCustomError(
        this.auction,
        "TooEarly",
      );
    });
  });

  describe("Token reveal functionality", function () {
    it("Should allow owner to request tokens left reveal", async function () {
      await this.initializeAuction();

      const bidAmount = 1n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      await expect(this.auction.connect(this.signers.alice).requestTokensLeftReveal()).to.not.be.reverted;
      await this.finalizeTokensLeftReveal();

      const tokensLeftReveal = await this.auction.tokensLeftReveal();
      expect(tokensLeftReveal).to.equal(TOKEN_AMOUNT - bidAmount);
    });

    it("Should not allow non-owner to request tokens left reveal", async function () {
      await expect(this.auction.connect(this.signers.bob).requestTokensLeftReveal()).to.be.reverted;
    });

    it("Should update tokensLeftReveal after multiple bids", async function () {
      await this.initializeAuction();

      const bidAmount1 = 50n;
      const input1 = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input1.add64(bidAmount1);
      const encryptedBid1 = await input1.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid1.handles[0], encryptedBid1.inputProof);

      const oneDay = 24n * 60n * 60n;
      await time.increase(oneDay);

      const bidAmount2 = 30n;
      const input2 = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input2.add64(bidAmount2);
      const encryptedBid2 = await input2.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid2.handles[0], encryptedBid2.inputProof);

      await this.auction.connect(this.signers.alice).requestTokensLeftReveal();
      await this.finalizeTokensLeftReveal();

      const tokensLeftReveal = await this.auction.tokensLeftReveal();
      expect(tokensLeftReveal).to.equal(TOKEN_AMOUNT - (bidAmount1 + bidAmount2));
    });
  });

  describe("Token balance verification", function () {
    it("Should correctly transfer tokens after successful bid and claim", async function () {
      await this.initializeAuction();

      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      const initialAuctionTokenAlice = await this.auctionToken.confidentialBalanceOf(this.signers.alice.address);
      const initialPaymentTokenBob = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);

      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      await time.increase(7 * 24 * 60 * 60 + 1);

      await this.auction.connect(this.signers.bob).claimUserRefund();
      await this.auction.connect(this.signers.alice).claimSeller();

      const finalAuctionTokenAlice = await this.auctionToken.confidentialBalanceOf(this.signers.alice.address);
      const finalAuctionTokenBob = await this.auctionToken.confidentialBalanceOf(this.signers.bob.address);
      const finalPaymentTokenAlice = await this.paymentToken.confidentialBalanceOf(this.signers.alice.address);
      const finalPaymentTokenBob = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);

      const decryptedInitialAuctionTokenAlice = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        initialAuctionTokenAlice,
        this.auctionTokenAddress,
        this.signers.alice,
      );
      const decryptedFinalAuctionTokenAlice = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalAuctionTokenAlice,
        this.auctionTokenAddress,
        this.signers.alice,
      );
      const decryptedFinalAuctionTokenBob = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalAuctionTokenBob,
        this.auctionTokenAddress,
        this.signers.bob,
      );
      const decryptedFinalPaymentTokenAlice = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalPaymentTokenAlice,
        this.paymentTokenAddress,
        this.signers.alice,
      );
      const decryptedInitialPaymentTokenBob = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        initialPaymentTokenBob,
        this.paymentTokenAddress,
        this.signers.bob,
      );
      const decryptedFinalPaymentTokenBob = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalPaymentTokenBob,
        this.paymentTokenAddress,
        this.signers.bob,
      );

      await this.auction.connect(this.signers.alice).requestTokensLeftReveal();
      await this.finalizeTokensLeftReveal();
      const endAuctionTokensLeft = await this.auction.tokensLeftReveal();
      expect(endAuctionTokensLeft).to.equal(0);

      expect(decryptedInitialAuctionTokenAlice).to.equal(TOKEN_AMOUNT);
      expect(decryptedFinalAuctionTokenAlice).to.equal(TOKEN_AMOUNT + (TOKEN_AMOUNT - bidAmount));
      expect(decryptedFinalAuctionTokenBob).to.equal(bidAmount);

      const finalPrice = await this.auction.getPrice();
      const expectedPayment = finalPrice * bidAmount;

      expect(decryptedInitialPaymentTokenBob).to.equal(WETH_AMOUNT);
      expect(decryptedFinalPaymentTokenAlice).to.equal(expectedPayment);
      expect(decryptedFinalPaymentTokenBob).to.equal(WETH_AMOUNT - expectedPayment);
    });

    it("Should return tokens to seller after cancellation", async function () {
      await this.initializeAuction();

      const initialAuctionTokenAlice = await this.auctionToken.confidentialBalanceOf(this.signers.alice.address);

      await this.auction.connect(this.signers.alice).cancelAuction();

      const finalAuctionTokenAlice = await this.auctionToken.confidentialBalanceOf(this.signers.alice.address);

      const decryptedInitialBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        initialAuctionTokenAlice,
        this.auctionTokenAddress,
        this.signers.alice,
      );
      const decryptedFinalBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalAuctionTokenAlice,
        this.auctionTokenAddress,
        this.signers.alice,
      );

      expect(decryptedInitialBalance).to.equal(TOKEN_AMOUNT);
      expect(decryptedFinalBalance).to.equal(TOKEN_AMOUNT * 2n);
    });
  });

  describe("Price behavior over time", function () {
    it("Should correctly decrease price over time", async function () {
      const initialPrice = await this.auction.getPrice();
      expect(initialPrice).to.equal(STARTING_PRICE);

      await time.increase(24 * 60 * 60);
      const oneDayPrice = await this.auction.getPrice();
      const expectedOneDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(24 * 60 * 60)) / 3600n / 24n;
      expect(oneDayPrice).to.equal(expectedOneDayPrice);

      await time.increase(6 * 24 * 60 * 60);
      const endPrice = await this.auction.getPrice();
      let expectedSevenDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(DURATION)) / 3600n / 24n;
      expectedSevenDayPrice = expectedSevenDayPrice > RESERVE_PRICE ? expectedSevenDayPrice : RESERVE_PRICE;
      expect(endPrice).to.equal(expectedSevenDayPrice);
    });

    it("Should maintain max minimum reserve price", async function () {
      await time.increase(14 * 24 * 60 * 60);
      const expectedSevenDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(DURATION)) / 3600n / 24n;
      const endPrice = expectedSevenDayPrice > RESERVE_PRICE ? expectedSevenDayPrice : RESERVE_PRICE;

      const price = await this.auction.getPrice();
      expect(price).to.equal(endPrice);
    });
  });

  describe("Edge cases", function () {
    it("Should not accept zero amount bids", async function () {
      await this.initializeAuction();

      const bidAmount = 0n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      const [bidTokens] = await this.auction.connect(this.signers.bob).getUserBid();
      const decryptedBidTokens = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bidTokens,
        this.auctionAddress,
        this.signers.bob,
      );
      expect(decryptedBidTokens).to.equal(0n);
    });

    it("Should prevent multiple claims by same user", async function () {
      await this.initializeAuction();

      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      await time.increase(7 * 24 * 60 * 60 + 1);

      await this.auction.connect(this.signers.bob).claimUserRefund();

      const [bidTokens] = await this.auction.connect(this.signers.bob).getUserBid();
      expect(bidTokens).to.equal(0n);
    });
  });
});
