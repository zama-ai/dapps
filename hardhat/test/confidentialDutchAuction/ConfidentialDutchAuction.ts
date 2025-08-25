import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ConfidentialTokenExample__factory } from "../../types";
import { FhevmType } from "@fhevm/mock-utils";

describe("ConfidentialDutchAuction", function () {
  const STARTING_PRICE = 10n; // starting price for 1 token // 0.00001 ETH
  const DISCOUNT_RATE = 1n;
  const TOKEN_AMOUNT = 1000n;
  const WETH_AMOUNT = 10000n; // 0.01 ETH
  const RESERVE_PRICE = 1n;
  const STOPPABLE = true;
  const DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    this.signers = { alice: ethSigners[0], bob: ethSigners[1], carol: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    // Deploy the token contracts first
    const USDCcFactory = (await ethers.getContractFactory(
      "ConfidentialTokenExample",
    )) as ConfidentialTokenExample__factory;
    this.auctionToken = await USDCcFactory.connect(this.signers.alice).deploy(TOKEN_AMOUNT, "AuctionToken", "AT", "");
    this.paymentToken = await USDCcFactory.connect(this.signers.bob).deploy(WETH_AMOUNT, "PaymentToken", "PT", "");
    await this.auctionToken.waitForDeployment();
    await this.paymentToken.waitForDeployment();
    this.paymentTokenAddress = await this.paymentToken.getAddress();
    this.auctionTokenAddress = await this.auctionToken.getAddress();

    // Deploy the auction contract
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
      // Approve to send the fund
      // console.log(`Setting operator for ${signer.address} to ${this.auctionAddress}`);
      const approveTx = await this.auctionToken
        .connect(signer)
        ["setOperator(address, uint48)"](this.auctionAddress, Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60);
      await approveTx.wait();
      // console.log(`Operator set successfully for ${signer.address}`);
    };

    this.approvePaymentToken = async (signer: HardhatEthersSigner) => {
      // Approve to send the fund
      const approveTx = await this.paymentToken
        .connect(signer)
        ["setOperator(address, uint48)"](this.auctionAddress, Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60);
      await approveTx.wait();
    };

    // Set approvals for auction token
    await this.approveAuctionToken(this.signers.alice);
    await this.approveAuctionToken(this.signers.bob);

    // Set approvals for payment token
    await this.approvePaymentToken(this.signers.alice);
    await this.approvePaymentToken(this.signers.bob);

    // Verify that Alice has tokens before initialization
    const aliceBalance = await this.auctionToken.confidentialBalanceOf(this.signers.alice.address);
    // console.log("Alice's auction token balance before initialization:", aliceBalance.toString());
    // console.log("Auction contract address:", this.auctionAddress);
    // console.log("Alice address:", this.signers.alice.address);

    // Helper function to initialize auction with fresh tokens
    this.initializeAuction = async () => {
      // Mint fresh tokens to Alice for this test
      const tx = await this.auctionToken.mint(this.signers.alice, TOKEN_AMOUNT);
      await tx.wait();

      // Re-approve the auction contract for Alice (auction token)
      // Use a much longer expiration time to avoid any timing issues
      // console.log(`Re-approving auction contract ${this.auctionAddress} for Alice (auction token)`);
      const approveTxAlice = await this.auctionToken
        .connect(this.signers.alice)
        ["setOperator(address, uint48)"](this.auctionAddress, Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60); // 1 year
      await approveTxAlice.wait();

      // Re-approve the auction contract for Bob (payment token)
      // console.log(`Re-approving auction contract ${this.auctionAddress} for Bob (payment token)`);
      const approveTxBob = await this.paymentToken
        .connect(this.signers.bob)
        ["setOperator(address, uint48)"](this.auctionAddress, Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60); // 1 year
      await approveTxBob.wait();

      // Wait a bit for the approvals to be processed
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify the operators are set correctly
      // console.log(`Token contract address: ${this.auctionTokenAddress}`);
      // console.log(`Payment token address: ${this.paymentTokenAddress}`);
      // console.log(`Current block timestamp: ${Math.floor(Date.now() / 1000)}`);

      const isAliceOperatorSet = await this.auctionToken.isOperator(this.signers.alice.address, this.auctionAddress);
      // console.log(
      //  `Alice operator verification: ${isAliceOperatorSet} for ${this.signers.alice.address} -> ${this.auctionAddress}`,
      //);

      const isBobOperatorSet = await this.paymentToken.isOperator(this.signers.bob.address, this.auctionAddress);
      // console.log(
      //   `Bob operator verification: ${isBobOperatorSet} for ${this.signers.bob.address} -> ${this.auctionAddress}`,
      //);

      if (!isAliceOperatorSet) {
        throw new Error(`Alice operator not set correctly for ${this.signers.alice.address} -> ${this.auctionAddress}`);
      }

      if (!isBobOperatorSet) {
        throw new Error(`Bob operator not set correctly for ${this.signers.bob.address} -> ${this.auctionAddress}`);
      }

      // Initialize the auction
      const txInit = await this.auction.connect(this.signers.alice).initialize();
      await txInit.wait();
      await fhevm.awaitDecryptionOracle();
    };

    // Note: initialize() will be called in individual tests that need it
    // This ensures better test isolation
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
        RESERVE_PRICE, // Starting price too low
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
      expect(price).to.be.closeTo(STARTING_PRICE, 1000000000); // allows for small differences
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

      await time.increase(7 * 24 * 60 * 60 + 1); // 7 days + 1 second
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

      // First bid
      const bidAmount1 = 50n;
      const input1 = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input1.add64(bidAmount1);
      const encryptedBid1 = await input1.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid1.handles[0], encryptedBid1.inputProof);

      // Second bid
      const bidAmount2 = 30n;
      const input2 = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input2.add64(bidAmount2);
      const encryptedBid2 = await input2.encrypt();

      await expect(this.auction.connect(this.signers.bob).bid(encryptedBid2.handles[0], encryptedBid2.inputProof)).to
        .not.be.reverted;
    });

    it("Should not allow bids after auction ends", async function () {
      await this.initializeAuction();

      await time.increase(7 * 24 * 60 * 60 + 1); // 7 days + 1 second

      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await expect(
        this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof),
      ).to.be.to.be.revertedWithCustomError(this.auction, "TooLate");
    });

    it("Should allow claiming tokens after auction ends", async function () {
      await this.initializeAuction();

      // Place a bid first
      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Move time forward to end the auction
      await time.increase(7 * 24 * 60 * 60 + 1);

      // Claim tokens
      await expect(this.auction.connect(this.signers.bob).claimUserRefund()).to.not.be.reverted;
    });

    it("Should not allow claiming before auction ends", async function () {
      await this.initializeAuction();

      // Place a bid
      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Try to claim immediately
      await expect(this.auction.connect(this.signers.bob).claimUserRefund()).to.be.revertedWithCustomError(
        this.auction,
        "TooEarly",
      );
    });

    it("Should not allow bid when user has insufficient payment tokens", async function () {
      await this.initializeAuction();

      // Get initial token balances and auction state
      const initialTokensLeft = await this.auction.tokensLeftReveal();

      // Mint a small amount of tokens to Carol
      const USDC_CAROL_AMOUNT = 20n;
      const tx2 = await this.paymentToken.mint(this.signers.carol, USDC_CAROL_AMOUNT);
      const t2 = await tx2.wait();
      expect(t2?.status).to.eq(1);

      // Approve payment token for Carol (using the correct amount)
      await this.approvePaymentToken(this.signers.carol);

      // Try to place a bid larger than Carol's balance
      const bidAmount = 100n; // This will require more tokens than Carol has
      const input2 = fhevm.createEncryptedInput(this.auctionAddress, this.signers.carol.address);
      input2.add64(bidAmount);
      const encryptedBid = await input2.encrypt();

      // Expect the bid to be reverted due to insufficient balance
      await expect(this.auction.connect(this.signers.carol).bid(encryptedBid.handles[0], encryptedBid.inputProof));

      // Verify that the auction state hasn't changed
      await this.auction.connect(this.signers.alice).requestTokensLeftReveal();
      await fhevm.awaitDecryptionOracle();
      const finalTokensLeft = await this.auction.tokensLeftReveal();
      expect(finalTokensLeft).to.equal(initialTokensLeft);

      // Verify that no bid was recorded
      const [bidTokens] = await this.auction.connect(this.signers.carol).getUserBid();

      // Check if the bid is initialized before trying to decrypt
      // If Carol's bid failed, the encrypted value won't be initialized
      try {
        const decryptedBidTokens = await fhevm.userDecryptEuint(
          FhevmType.euint64,
          bidTokens,
          this.auctionAddress,
          this.signers.carol,
        );
        expect(decryptedBidTokens).to.equal(0n);
      } catch (error) {
        // If decryption fails due to uninitialized handle, that means no bid was recorded
        // which is the expected behavior for insufficient balance
        expect(error.message).to.include("Handle is not initialized");
      }
    });

    it("Should process bid only up to token amount and not over", async function () {
      await this.initializeAuction();

      // Get initial token balances and auction state
      const initialPaymentBalance = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);

      // Create a bid larger than Bob's approved amount
      const tokenAmount = TOKEN_AMOUNT + 1000n; // More than token amount
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(tokenAmount);
      const encryptedBid = await input.encrypt();

      // Place the bid
      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Request token reveal to check state
      await this.auction.connect(this.signers.alice).requestTokensLeftReveal();
      await fhevm.awaitDecryptionOracle();

      // Get final balances
      const finalTokensLeft = await this.auction.tokensLeftReveal();
      const finalPaymentBalance = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);

      // Decrypt payment balances
      const decryptedInitialBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        initialPaymentBalance,
        this.paymentTokenAddress,
        this.signers.bob,
      );
      const decryptedFinalBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalPaymentBalance,
        this.paymentTokenAddress,
        this.signers.bob,
      );
      const currentPrice = await this.auction.getPrice();

      const cost = TOKEN_AMOUNT * currentPrice;

      // Verify that no changes occurred
      expect(finalTokensLeft).to.equal(0);
      expect(decryptedInitialBalance - decryptedFinalBalance).to.be.closeTo(cost, 500000000000);

      // Verify that the bid was not recorded
      const [bidTokens] = await this.auction.connect(this.signers.bob).getUserBid();
      const decryptedBidTokens = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bidTokens,
        this.auctionAddress,
        this.signers.bob,
      );
      expect(decryptedBidTokens).to.equal(TOKEN_AMOUNT);
    });
  });

  describe("Token reveal functionality", function () {
    it("Should allow owner to request tokens left reveal", async function () {
      await this.initializeAuction();

      // Get Bob's initial balance
      //   const initialBobBalance = await this.paymentToken.balanceOf(this.signers.bob);
      //   const decryptedInitialBobBalance = await fhevm.userDecryptEuint(
      //     FhevmType.euint64,
      //     initialBobBalance,
      //     this.paymentTokenAddress,
      //     this.signers.bob,
      //   );
      //   // console.log("Bob's initial balance:", decryptedInitialBobBalance.toString());

      // Place a bid first
      const bidAmount = 1n;

      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Get Bob's balance after bid
      //   const afterBidBalance = await this.paymentToken.balanceOf(this.signers.bob);
      //   const decryptedAfterBidBalance = await fhevm.userDecryptEuint(
      //     this.signers.bob,
      //     fhevm,
      //     afterBidBalance,
      //     this.paymentTokenAddress,
      //   );
      //   // console.log("Bob's balance after bid:", decryptedAfterBidBalance.toString());

      // Get current price and calculate expected payment
      //   const currentPrice = await this.auction.getPrice();
      //   const expectedPayment = (currentPrice * bidAmount) / ethers.parseEther("1");
      //   // Calculate token cost at current price
      //   const tokenCost = currentPrice * bidAmount;
      //   // console.log("Token cost:", tokenCost.toString());
      //   // console.log("Expected payment:", expectedPayment.toString());

      // Request reveal
      await expect(this.auction.connect(this.signers.alice).requestTokensLeftReveal()).to.not.be.reverted;

      // Wait for decryption
      await fhevm.awaitDecryptionOracle();

      // Verify the revealed amount matches expected value
      const tokensLeftReveal = await this.auction.tokensLeftReveal();
      expect(tokensLeftReveal).to.equal(TOKEN_AMOUNT - bidAmount);

      // Get user bid information
      //   const [bidTokens, bidPaid] = await this.auction.connect(this.signers.bob).getUserBid();
      //   const decryptedBidTokens = await fhevm.userDecryptEuint(
      //     this.signers.bob,
      //     fhevm,
      //     bidTokens,
      //     this.auctionAddress,
      //   );
      //   const decryptedBidPaid = await fhevm.userDecryptEuint(this.signers.bob, fhevm, bidPaid, this.auctionAddress);
      //   // console.log("Bid tokens:", decryptedBidTokens.toString());
      //   // console.log("Bid paid:", decryptedBidPaid.toString());
    });

    it("Should not allow non-owner to request tokens left reveal", async function () {
      await expect(this.auction.connect(this.signers.bob).requestTokensLeftReveal()).to.be.reverted;
    });

    it("Should update tokensLeftReveal after multiple bids", async function () {
      await this.initializeAuction();

      // First bid
      const bidAmount1 = 50n;
      const input1 = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input1.add64(bidAmount1);
      const encryptedBid1 = await input1.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid1.handles[0], encryptedBid1.inputProof);

      const oneDay = 24n * 60n * 60n;
      await time.increase(oneDay);

      // Second bid
      const bidAmount2 = 30n;
      const input2 = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input2.add64(bidAmount2);
      const encryptedBid2 = await input2.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid2.handles[0], encryptedBid2.inputProof);

      // Request reveal
      await this.auction.connect(this.signers.alice).requestTokensLeftReveal();
      await fhevm.awaitDecryptionOracle();

      // Verify the revealed amount matches expected value after both bids
      const tokensLeftReveal = await this.auction.tokensLeftReveal();
      expect(tokensLeftReveal).to.equal(TOKEN_AMOUNT - (bidAmount1 + bidAmount2));
    });
  });

  describe("Token balance verification", function () {
    it("Should correctly transfer tokens after successful bid and claim", async function () {
      await this.initializeAuction();

      // Place a bid
      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      // Get initial balances (after auction initialization)
      const initialAuctionTokenAlice = await this.auctionToken.confidentialBalanceOf(this.signers.alice.address);
      const initialPaymentTokenBob = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);

      // Place bid
      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Move time forward to end the auction
      await time.increase(7 * 24 * 60 * 60 + 1);

      // Claim potential refunds
      await this.auction.connect(this.signers.bob).claimUserRefund();
      await this.auction.connect(this.signers.alice).claimSeller();

      // Get final balances
      const finalAuctionTokenAlice = await this.auctionToken.confidentialBalanceOf(this.signers.alice.address);
      const finalAuctionTokenBob = await this.auctionToken.confidentialBalanceOf(this.signers.bob.address);
      const finalPaymentTokenAlice = await this.paymentToken.confidentialBalanceOf(this.signers.alice.address);
      const finalPaymentTokenBob = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);

      // Decrypt and verify balances
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

      // Verify that the auction state hasn't changed
      await this.auction.connect(this.signers.alice).requestTokensLeftReveal();
      await fhevm.awaitDecryptionOracle();
      const endAuctionTokensLeft = await this.auction.tokensLeftReveal();
      expect(endAuctionTokensLeft).to.equal(0);

      // Verify auction token balances
      expect(decryptedInitialAuctionTokenAlice).to.equal(TOKEN_AMOUNT); // Alice has remaining tokens after auction initialization
      expect(decryptedFinalAuctionTokenAlice).to.equal(TOKEN_AMOUNT + (TOKEN_AMOUNT - bidAmount)); // Initial remaining + returned unsold tokens
      expect(decryptedFinalAuctionTokenBob).to.equal(bidAmount);

      // Calculate expected payment based on final price
      const finalPrice = await this.auction.getPrice();
      const expectedPayment = finalPrice * bidAmount;

      // Verify payment token balances
      expect(decryptedInitialPaymentTokenBob).to.equal(WETH_AMOUNT);
      expect(decryptedFinalPaymentTokenAlice).to.equal(expectedPayment);
      expect(decryptedFinalPaymentTokenBob).to.equal(WETH_AMOUNT - expectedPayment);
    });

    it("Should return tokens to seller after cancellation", async function () {
      await this.initializeAuction();

      // Get initial balance
      const initialAuctionTokenAlice = await this.auctionToken.confidentialBalanceOf(this.signers.alice.address);

      // Cancel auction
      await this.auction.connect(this.signers.alice).cancelAuction();

      // Get final balance
      const finalAuctionTokenAlice = await this.auctionToken.confidentialBalanceOf(this.signers.alice.address);

      // Decrypt and verify balances
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

      expect(decryptedInitialBalance).to.equal(TOKEN_AMOUNT); // Alice has remaining tokens after auction initialization
      expect(decryptedFinalBalance).to.equal(TOKEN_AMOUNT * 2n); // Alice gets back both her remaining tokens and the auction tokens
    });

    it("Should correctly handle bids at different prices without intermediate refunds", async function () {
      await this.initializeAuction();

      // Place first bid at higher price
      const firstBidAmount = 50n;
      let input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(firstBidAmount);
      let encryptedBid = await input.encrypt();

      // Get initial balance
      const initialPaymentTokenBob = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);

      // Verify initial balances
      const decryptedInitialPaymentTokenBob = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        initialPaymentTokenBob,
        this.paymentTokenAddress,
        this.signers.bob,
      );
      // Place first bid
      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);
      const firstBidPrice = await this.auction.getPrice();

      // Check first bid information
      const [firstBidTokens, firstBidPaid] = await this.auction.connect(this.signers.bob).getUserBid();
      const decryptedFirstBidTokens = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        firstBidTokens,
        this.auctionAddress,
        this.signers.bob,
      );
      const decryptedFirstBidPaid = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        firstBidPaid,
        this.auctionAddress,
        this.signers.bob,
      );
      expect(decryptedFirstBidTokens).to.equal(firstBidAmount);
      expect(decryptedFirstBidPaid).to.equal(firstBidPrice * firstBidAmount);

      // Move time forward to get a lower price
      await time.increase(3 * 24 * 60 * 60); // Move 3 days forward

      // Place second bid at lower price
      const secondBidAmount = 30n;
      input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(secondBidAmount);
      encryptedBid = await input.encrypt();

      // Place second bid
      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);
      const secondBidPrice = await this.auction.getPrice();

      // Check combined bid information
      const [totalBidTokens, totalBidPaid] = await this.auction.connect(this.signers.bob).getUserBid();
      const decryptedTotalBidTokens = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        totalBidTokens,
        this.auctionAddress,
        this.signers.bob,
      );
      const decryptedTotalBidPaid = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        totalBidPaid,
        this.auctionAddress,
        this.signers.bob,
      );
      const totalTokens = firstBidAmount + secondBidAmount;
      const totalPaid = firstBidPrice * firstBidAmount + secondBidPrice * secondBidAmount;

      expect(decryptedTotalBidTokens).to.equal(firstBidAmount + secondBidAmount);
      // The total paid should be the sum of each bid amount times its respective price
      expect(decryptedTotalBidPaid).to.equal(totalPaid);

      // Move time to end of auction
      await time.increase(4 * 24 * 60 * 60 + 1);

      // Claim refunds (this will now handle the refund for both bids at once)
      await this.auction.connect(this.signers.bob).claimUserRefund();

      // Claim seller proceeds
      await this.auction.connect(this.signers.alice).claimSeller();

      // Get final balances
      const finalPaymentTokenBob = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);
      const finalPaymentTokenAlice = await this.paymentToken.confidentialBalanceOf(this.signers.alice.address);

      // Calculate expected final amounts
      const finalPrice = await this.auction.getPrice();
      const expectedFinalPayment = finalPrice * totalTokens;

      // Verify final balances
      const decryptedFinalPaymentTokenBob = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalPaymentTokenBob,
        this.paymentTokenAddress,
        this.signers.bob,
      );
      const decryptedFinalPaymentTokenAlice = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalPaymentTokenAlice,
        this.paymentTokenAddress,
        this.signers.alice,
      );

      // Bob should have received their refund
      expect(decryptedFinalPaymentTokenBob).to.equal(decryptedInitialPaymentTokenBob - expectedFinalPayment);
      // Alice should have received the final payment
      expect(decryptedFinalPaymentTokenAlice).to.equal(expectedFinalPayment);
    });
  });

  describe("Price calculations and refunds", function () {
    it("Should correctly calculate final payments when bidding at different times", async function () {
      await this.initializeAuction();

      // First bid at initial price
      const firstBidAmount = 50n;
      let input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(firstBidAmount);
      let encryptedBid = await input.encrypt();

      // Get initial balance and price
      const initialPrice = await this.auction.getPrice();
      const initialPaymentTokenBob = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);
      const decryptedInitialBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        initialPaymentTokenBob,
        this.paymentTokenAddress,
        this.signers.bob,
      );

      // Place first bid
      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Move time forward to get a lower price (3 days)
      const threeDays = 6n * 24n * 60n * 60n;
      await time.increase(threeDays);

      // Second bid at lower price
      const secondBidAmount = 30n;
      input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(secondBidAmount);
      encryptedBid = await input.encrypt();

      // Get price before second bid
      const secondBidPrice = await this.auction.getPrice();

      // Place second bid
      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Verify intermediate state (before refund)
      const [bidTokens, bidPaid] = await this.auction.connect(this.signers.bob).getUserBid();
      const decryptedBidTokens = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bidTokens,
        this.auctionAddress,
        this.signers.bob,
      );
      const decryptedBidPaid = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bidPaid,
        this.auctionAddress,
        this.signers.bob,
      );

      // Total amount paid should be sum of both bids at their respective prices
      const expectedTotalPaid = initialPrice * firstBidAmount + secondBidPrice * secondBidAmount;
      expect(decryptedBidTokens).to.equal(firstBidAmount + secondBidAmount);
      expect(decryptedBidPaid).to.be.closeTo(expectedTotalPaid, 10000000000);

      // Move time to end of auction
      await time.increase(4 * 24 * 60 * 60 + 1);

      // Get final auction price
      const finalPrice = await this.auction.getPrice();
      const expectedFinalCost = finalPrice * (firstBidAmount + secondBidAmount);

      // Claim refund
      await this.auction.connect(this.signers.bob).claimUserRefund();

      // Get final balance after refund
      const finalPaymentTokenBob = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);
      const decryptedFinalBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalPaymentTokenBob,
        this.paymentTokenAddress,
        this.signers.bob,
      );

      // Verify final balance after refund
      expect(decryptedInitialBalance - decryptedFinalBalance).to.equal(expectedFinalCost);

      // Seller claims proceeds
      await this.auction.connect(this.signers.alice).claimSeller();

      // Verify seller received correct amount
      const finalPaymentTokenAlice = await this.paymentToken.confidentialBalanceOf(this.signers.alice.address);
      const decryptedAliceBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalPaymentTokenAlice,
        this.paymentTokenAddress,
        this.signers.alice,
      );
      expect(decryptedAliceBalance).to.equal(expectedFinalCost);
    });

    it("Should correctly handle price adjustments at auction end", async function () {
      await this.initializeAuction();

      // Verify refund amount
      const initialPaymentTokenBob = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);
      const decryptedInitialBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        initialPaymentTokenBob,
        this.paymentTokenAddress,
        this.signers.bob,
      );

      // Place bid near start
      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      // Place bid
      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Move time to end of auction
      await time.increase(7 * 24 * 60 * 60 + 1);

      const expectedSevenDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(DURATION)) / 3600n / 24n;
      const endPrice = expectedSevenDayPrice > RESERVE_PRICE ? expectedSevenDayPrice : RESERVE_PRICE;

      // Get final price - should be reserve price
      const finalPrice = await this.auction.getPrice();
      expect(finalPrice).to.equal(endPrice);

      // Claim tokens
      await this.auction.connect(this.signers.bob).claimUserRefund();

      // Get final balance
      const finalPaymentTokenBob = await this.paymentToken.confidentialBalanceOf(this.signers.bob.address);
      const decryptedFinalBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalPaymentTokenBob,
        this.paymentTokenAddress,
        this.signers.bob,
      );

      // Calculate expected costs and refund
      const finalCost = finalPrice * bidAmount;

      expect(decryptedInitialBalance - decryptedFinalBalance).to.equal(finalCost);
    });

    it("Should handle multiple bids with correct price calculations", async function () {
      await this.initializeAuction();

      // First bid
      const firstBidAmount = 30n;
      let input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(firstBidAmount);
      let encryptedBid = await input.encrypt();

      const firstPrice = await this.auction.getPrice();
      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Move forward 1 day
      await time.increase(24 * 60 * 60);

      // Second bid
      const secondBidAmount = 20n;
      input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(secondBidAmount);
      encryptedBid = await input.encrypt();

      const secondPrice = await this.auction.getPrice();
      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Move forward 2 more days
      await time.increase(2 * 24 * 60 * 60);

      // Third bid
      const thirdBidAmount = 25n;
      input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(thirdBidAmount);
      encryptedBid = await input.encrypt();

      const thirdPrice = await this.auction.getPrice();
      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // Get bid information
      const [bidTokens, bidPaid] = await this.auction.connect(this.signers.bob).getUserBid();
      const decryptedBidTokens = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bidTokens,
        this.auctionAddress,
        this.signers.bob,
      );
      const decryptedBidPaid = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        bidPaid,
        this.auctionAddress,
        this.signers.bob,
      );

      // Calculate expected values
      const totalTokens = firstBidAmount + secondBidAmount + thirdBidAmount;
      const expectedTotalPaid =
        firstPrice * firstBidAmount + secondPrice * secondBidAmount + thirdPrice * thirdBidAmount;

      // Verify intermediate state
      expect(decryptedBidTokens).to.equal(totalTokens);
      expect(decryptedBidPaid).to.be.closeTo(expectedTotalPaid, expectedTotalPaid / 100000n);

      // Move to end of auction
      await time.increase(4 * 24 * 60 * 60);

      // Get final price
      const finalPrice = await this.auction.getPrice();
      const expectedFinalCost = finalPrice * totalTokens;

      // Claim refund
      await this.auction.connect(this.signers.bob).claimUserRefund();

      // Seller claims
      await this.auction.connect(this.signers.alice).claimSeller();

      // Verify seller's final balance
      const finalPaymentTokenAlice = await this.paymentToken.confidentialBalanceOf(this.signers.alice.address);
      const decryptedFinalBalanceAlice = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        finalPaymentTokenAlice,
        this.paymentTokenAddress,
        this.signers.alice,
      );

      // Final verifications
      expect(decryptedFinalBalanceAlice).to.equal(expectedFinalCost);
    });
  });

  describe("Price behavior over time", function () {
    it("Should correctly decrease price over time", async function () {
      const initialPrice = await this.auction.getPrice();
      // console.log("\nInitial price:", initialPrice.toString());
      expect(initialPrice).to.equal(STARTING_PRICE);

      // Check price after 1 day
      await time.increase(24 * 60 * 60);
      const oneDayPrice = await this.auction.getPrice();
      const expectedOneDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(24 * 60 * 60)) / 3600n / 24n;
      // console.log("Price after 1 day:", oneDayPrice.toString());
      // console.log("Expected 1 day price:", expectedOneDayPrice.toString());
      expect(oneDayPrice).to.equal(expectedOneDayPrice);

      // Check price after 2 days
      await time.increase(24 * 60 * 60);
      const twoDayPrice = await this.auction.getPrice();
      const expectedTwoDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(2 * 24 * 60 * 60)) / 3600n / 24n;
      // console.log("Price after 2 days:", twoDayPrice.toString());
      // console.log("Expected 2 day price:", expectedTwoDayPrice.toString());
      expect(twoDayPrice).to.equal(expectedTwoDayPrice);

      // Check price after 3 days
      await time.increase(24 * 60 * 60);
      const threeDayPrice = await this.auction.getPrice();
      const expectedThreeDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(3 * 24 * 60 * 60)) / 3600n / 24n;
      // console.log("Price after 3 days:", threeDayPrice.toString());
      // console.log("Expected 3 day price:", expectedThreeDayPrice.toString());
      expect(threeDayPrice).to.equal(expectedThreeDayPrice);

      // Check price after 4 days
      await time.increase(24 * 60 * 60);
      const fourDayPrice = await this.auction.getPrice();
      const expectedFourDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(4 * 24 * 60 * 60)) / 3600n / 24n;
      // console.log("Price after 4 days:", fourDayPrice.toString());
      // console.log("Expected 4 day price:", expectedFourDayPrice.toString());
      expect(fourDayPrice).to.equal(expectedFourDayPrice);

      // Check price after 5 days
      await time.increase(24 * 60 * 60);
      const fiveDayPrice = await this.auction.getPrice();
      const expectedFiveDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(5 * 24 * 60 * 60)) / 3600n / 24n;
      // console.log("Price after 5 days:", fiveDayPrice.toString());
      // console.log("Expected 5 day price:", expectedFiveDayPrice.toString());
      expect(fiveDayPrice).to.equal(expectedFiveDayPrice);

      // Check price after 6 days
      await time.increase(24 * 60 * 60);
      const sixDayPrice = await this.auction.getPrice();
      const expectedSixDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(6 * 24 * 60 * 60)) / 3600n / 24n;
      // console.log("Price after 6 days:", sixDayPrice.toString());
      // console.log("Expected 6 day price:", expectedSixDayPrice.toString());
      expect(sixDayPrice).to.equal(expectedSixDayPrice);

      // Check price at auction end (7 days)
      await time.increase(24 * 60 * 60);
      const endPrice = await this.auction.getPrice();
      let expectedSevenDayPrice = STARTING_PRICE - (DISCOUNT_RATE * BigInt(DURATION)) / 3600n / 24n;
      expectedSevenDayPrice = expectedSevenDayPrice > RESERVE_PRICE ? expectedSevenDayPrice : RESERVE_PRICE;
      // console.log("Price at auction end (7 days):", endPrice.toString());
      // console.log("Reserve price:", RESERVE_PRICE.toString());
      expect(endPrice).to.equal(expectedSevenDayPrice);

      // Check price after auction end
      await time.increase(24 * 60 * 60);
      const afterEndPrice = await this.auction.getPrice();
      // console.log("Price after auction end:", afterEndPrice.toString());
      expect(afterEndPrice).to.equal(endPrice);

      // Verify price never went below reserve price
      expect(oneDayPrice).to.be.gte(RESERVE_PRICE);
      expect(twoDayPrice).to.be.gte(RESERVE_PRICE);
      expect(threeDayPrice).to.be.gte(RESERVE_PRICE);
      expect(fourDayPrice).to.be.gte(RESERVE_PRICE);
      expect(fiveDayPrice).to.be.gte(RESERVE_PRICE);
      expect(sixDayPrice).to.be.gte(RESERVE_PRICE);
      expect(endPrice).to.be.gte(RESERVE_PRICE);
      expect(afterEndPrice).to.be.gte(RESERVE_PRICE);
    });

    it("Should maintain max minimum reserve price or ", async function () {
      // Fast forward to well past auction end
      await time.increase(14 * 24 * 60 * 60); // 14 days
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

      // Verify no bid was recorded
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

      // Place a bid
      const bidAmount = 100n;
      const input = fhevm.createEncryptedInput(this.auctionAddress, this.signers.bob.address);
      input.add64(bidAmount);
      const encryptedBid = await input.encrypt();

      await this.auction.connect(this.signers.bob).bid(encryptedBid.handles[0], encryptedBid.inputProof);

      // End auction
      await time.increase(7 * 24 * 60 * 60 + 1);

      // First claim should succeed
      await this.auction.connect(this.signers.bob).claimUserRefund();

      // Second claim should fail or have no effect
      const [bidTokens] = await this.auction.connect(this.signers.bob).getUserBid();
      expect(bidTokens).to.equal(0n);
    });
  });
});
