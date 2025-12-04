import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { Airdrop, IERC7984 } from "../../types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Airdrop", function () {
  let airdrop: Airdrop;
  let token: IERC7984;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const INITIAL_SUPPLY = 1_000_000_000_000; // 1M tokens with 6 decimals
  const AIRDROP_AMOUNT = 100_000_000; // 100 tokens with 6 decimals

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy test token
    token = await ethers.deployContract("ERC7984Example", [
      INITIAL_SUPPLY,
      "Test Token",
      "TEST",
      "https://example.com/token",
    ]);

    // Deploy Airdrop contract
    airdrop = await ethers.deployContract("Airdrop");

    // Transfer tokens to airdrop contract
    const encryptedInput = await fhevm
      .createEncryptedInput(await token.getAddress(), owner.address)
      .add64(500_000_000) // 500 tokens for airdrop pool
      .encrypt();

    await token
      .connect(owner)
      [
        "confidentialTransfer(address,bytes32,bytes)"
      ](await airdrop.getAddress(), encryptedInput.handles[0], encryptedInput.inputProof);
  });

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      expect(await airdrop.getAddress()).to.be.properAddress;
    });

    it("should set the correct owner", async function () {
      expect(await airdrop.owner()).to.equal(owner.address);
    });
  });

  describe("Claim functionality", function () {
    it("should allow user to claim airdrop for a token", async function () {
      await expect(airdrop.connect(user1).claim(await token.getAddress())).to.not.be.reverted;

      // Verify user has claimed
      expect(await airdrop.hasClaimed(user1.address, await token.getAddress())).to.be.true;

      // Verify user received tokens (check balance handle exists)
      const balanceHandle = await token.confidentialBalanceOf(user1.address);
      expect(balanceHandle).to.not.be.undefined;
    });

    it("should prevent double claiming for the same token", async function () {
      // First claim should succeed
      await expect(airdrop.connect(user1).claim(await token.getAddress())).to.not.be.reverted;

      // Second claim should fail
      await expect(airdrop.connect(user1).claim(await token.getAddress())).to.be.revertedWithCustomError(
        airdrop,
        "AlreadyClaimed",
      );
    });

    it("should allow same user to claim different tokens", async function () {
      // Deploy second token
      const token2 = await ethers.deployContract("ERC7984Example", [INITIAL_SUPPLY, "Test Token 2", "TEST2", ""]);

      // Transfer tokens to airdrop contract
      const encryptedInput = await fhevm
        .createEncryptedInput(await token2.getAddress(), owner.address)
        .add64(500_000_000)
        .encrypt();

      await token2
        .connect(owner)
        [
          "confidentialTransfer(address,bytes32,bytes)"
        ](await airdrop.getAddress(), encryptedInput.handles[0], encryptedInput.inputProof);

      // Claim first token
      await expect(airdrop.connect(user1).claim(await token.getAddress())).to.not.be.reverted;

      // Claim second token
      await expect(airdrop.connect(user1).claim(await token2.getAddress())).to.not.be.reverted;

      // Verify both claims
      expect(await airdrop.hasClaimed(user1.address, await token.getAddress())).to.be.true;
      expect(await airdrop.hasClaimed(user1.address, await token2.getAddress())).to.be.true;
    });

    it("should allow different users to claim the same token", async function () {
      // User1 claims
      await expect(airdrop.connect(user1).claim(await token.getAddress())).to.not.be.reverted;

      // User2 claims
      await expect(airdrop.connect(user2).claim(await token.getAddress())).to.not.be.reverted;

      // Verify both claims
      expect(await airdrop.hasClaimed(user1.address, await token.getAddress())).to.be.true;
      expect(await airdrop.hasClaimed(user2.address, await token.getAddress())).to.be.true;
    });

    it("should revert if token address is zero", async function () {
      await expect(airdrop.connect(user1).claim(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        airdrop,
        "InvalidToken",
      );
    });
  });

  describe("hasClaimed view function", function () {
    it("should return false before claiming", async function () {
      expect(await airdrop.hasClaimed(user1.address, await token.getAddress())).to.be.false;
    });

    it("should return true after claiming", async function () {
      await airdrop.connect(user1).claim(await token.getAddress());
      expect(await airdrop.hasClaimed(user1.address, await token.getAddress())).to.be.true;
    });
  });
});
