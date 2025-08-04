import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { Signers } from "../types";
import { deployConfidentialETHWrapperFixture, reencryptBalance } from "./confidentialETH.fixture";

describe("ConfidentialETHWrapper", function () {
  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
    this.signers = {} as Signers;

    const signers = await ethers.getSigners();
    this.signers.alice = signers[0];
    this.signers.bob = signers[1];
  });

  beforeEach(async function () {
    const deployment = await deployConfidentialETHWrapperFixture();
    this.confidentialETHWrapper = deployment.confidentialETHWrapper;
    this.confidentialETHWrapperAddress = deployment.confidentialETHWrapper_address;

    this.encryptUnwrapParam = async (
      signer: HardhatEthersSigner,
      amount: bigint,
    ): Promise<{
      handles: Uint8Array[];
      inputProof: Uint8Array;
    }> => {
      const amountInput = hre.fhevm.createEncryptedInput(this.confidentialETHWrapperAddress, signer.address);
      amountInput.add64(amount);
      return await amountInput.encrypt();
    };
  });

  it("name/symbol are automatically set", async function () {
    expect(await this.confidentialETHWrapper.name()).to.eq("Confidential Wrapped Ether");
    expect(await this.confidentialETHWrapper.symbol()).to.eq("WETHc");
  });

  it("can wrap", async function () {
    const amountToWrap = "0.1";
    const amountToWrap6Decimals = ethers.parseUnits(amountToWrap, 6);
    const amountToWrap18Decimals = ethers.parseUnits(amountToWrap, 18);
    // @dev The amount to mint is greater than amountToWrap since each tx costs gas
    const amountToMint = amountToWrap18Decimals + ethers.parseUnits("1", 18);
    await ethers.provider.send("hardhat_setBalance", [this.signers.alice.address, "0x" + amountToMint.toString(16)]);

    const tx = await this.confidentialETHWrapper.connect(this.signers.alice).wrap({ value: amountToWrap18Decimals });
    await tx.wait();

    // Check encrypted balance
    expect(
      await reencryptBalance(this.signers.alice, this.confidentialETHWrapper, this.confidentialETHWrapperAddress),
    ).to.equal(amountToWrap6Decimals);

    // Check ETH balance of the contract
    expect(await ethers.provider.getBalance(this.confidentialETHWrapperAddress)).to.equal(amountToWrap18Decimals);
  });

  it("can unwrap", async function () {
    const amountToWrap = "0.1";
    const amountToWrap6Decimals = ethers.parseUnits(amountToWrap, 6);
    const amountToWrap18Decimals = ethers.parseUnits(amountToWrap, 18);
    const amountToUnwrap = "0.1";
    const amountToUnwrap6Decimals = ethers.parseUnits(amountToUnwrap, 6);

    // @dev The amount to mint is greater than amountToWrap since each tx costs gas
    const amountToMint = amountToWrap18Decimals + ethers.parseUnits("1", 18);
    await ethers.provider.send("hardhat_setBalance", [this.signers.alice.address, "0x" + amountToMint.toString(16)]);

    let tx = await this.confidentialETHWrapper.connect(this.signers.alice).wrap({ value: amountToWrap18Decimals });
    await tx.wait();

    // Encrypt the amount
    const aliceAmountEncrypted = await this.encryptUnwrapParam(this.signers.alice, amountToUnwrap6Decimals);

    tx = await this.confidentialETHWrapper
      .connect(this.signers.alice)
      ["unwrap(bytes32,bytes)"](aliceAmountEncrypted.handles[0], aliceAmountEncrypted.inputProof);
    await tx.wait();
    await hre.fhevm.awaitDecryptionOracle();

    // Check encrypted balance
    expect(
      await reencryptBalance(this.signers.alice, this.confidentialETHWrapper, this.confidentialETHWrapperAddress),
    ).to.equal(amountToWrap6Decimals - amountToUnwrap6Decimals);

    // Unwrap all
    const amount = amountToWrap6Decimals - amountToUnwrap6Decimals;
    const encryptedAmount = await this.encryptUnwrapParam(this.signers.alice, amount);

    tx = await this.confidentialETHWrapper["unwrap(bytes32,bytes)"](encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();
    await hre.fhevm.awaitDecryptionOracle();

    expect(
      await reencryptBalance(this.signers.alice, this.confidentialETHWrapper, this.confidentialETHWrapperAddress),
    ).to.equal(BigInt("0"));
  });
});
