import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { Signers } from "../types";
import { deployConfidentialERC20WrapperFixture } from "./confidentialERC20Wrapper.fixture";

describe("ConfidentialERC20Wrapper", function () {
  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
    this.signers = {} as Signers;

    const signers = await ethers.getSigners();
    this.signers.owner = signers[0];
    this.signers.alice = signers[1];
  });

  beforeEach(async function () {
    const deployment = await deployConfidentialERC20WrapperFixture(this.signers.owner);

    this.mockERC20 = deployment.mockERC20;
    this.mockERC20_address = deployment.mockERC20_address;

    this.confidentialERC20Wrapper = deployment.confidentialERC20Wrapper;
    this.confidentialERC20WrapperAddress = deployment.confidentialERC20Wrapper_address;

    // Mint some USDC to Alice
    await this.mockERC20.connect(this.signers.owner).mint(this.signers.alice.address);
  });

  it("should wrap/unwrap USDC", async function () {
    const USDCAmoutToWrap = 1_000n;
    const aliceBalanceBefore = await this.mockERC20.balanceOf(this.signers.alice.address);

    // Alice need to approve the wrapper
    await this.mockERC20.connect(this.signers.alice).approve(this.confidentialERC20WrapperAddress, USDCAmoutToWrap);

    // Alice wrap some USDC
    const tx = await this.confidentialERC20Wrapper
      .connect(this.signers.alice)
      .wrap(this.signers.alice.address, USDCAmoutToWrap);
    await tx.wait();

    // Check Alice & contract balance from the USDC
    const aliceBalanceAfter = aliceBalanceBefore - USDCAmoutToWrap;
    expect(await this.mockERC20.balanceOf(this.signers.alice.address)).to.be.equal(aliceBalanceAfter);
    expect(await this.mockERC20.balanceOf(this.confidentialERC20WrapperAddress)).to.be.equal(USDCAmoutToWrap);

    // Check Alice Encrypted balance
    const encryptedBalance = await this.confidentialERC20Wrapper
      .connect(this.signers.alice)
      .confidentialBalanceOf(this.signers.alice.address);

    const aliceEncryptedBalance = await hre.fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      this.confidentialERC20WrapperAddress,
      this.signers.alice,
    );

    expect(aliceEncryptedBalance).to.be.equal(USDCAmoutToWrap); // Same decimal amout here

    /// Now perfom an unwrap
    const amountToUnwrap = 500n;

    // Set the amount to unwrap
    const unwrapAmoutInput = hre.fhevm.createEncryptedInput(
      this.confidentialERC20WrapperAddress,
      this.signers.alice.address,
    );
    unwrapAmoutInput.add64(amountToUnwrap);
    const encryptedAmountToUnwrap = await unwrapAmoutInput.encrypt();

    const UnwrapTx = await this.confidentialERC20Wrapper
      .connect(this.signers.alice)
      [
        "unwrap(address,address,bytes32,bytes)"
      ](this.signers.alice.address, this.signers.alice.address, encryptedAmountToUnwrap.handles[0], encryptedAmountToUnwrap.inputProof);
    await UnwrapTx.wait();

    // Wait for oracle process
    await hre.fhevm.awaitDecryptionOracle();

    // Get Alice balance after
    const aliceBalanceAfterUnwrap = aliceBalanceAfter + amountToUnwrap;
    expect(await this.mockERC20.balanceOf(this.signers.alice.address)).to.be.equal(aliceBalanceAfterUnwrap);
  });

  it("should pause and resume the wrapper", async function () {
    // Pause the wrapper
    await this.mockERC20.connect(this.signers.owner).pause();

    // Check that the wrapper is paused
    const isPausableAddress = await this.confidentialERC20Wrapper.pausableToken();
    const isPausable = await ethers.getContractAt("IsPausable", isPausableAddress);

    expect(await isPausable.paused()).to.be.true;

    // Try to wrap USDC while paused
    await this.mockERC20.connect(this.signers.alice).approve(this.confidentialERC20WrapperAddress, 1000n);
    await expect(
      this.confidentialERC20Wrapper.connect(this.signers.alice).wrap(this.signers.alice.address, 1000n),
    ).to.be.revertedWith("Paused");

    // Resume the wrapper
    await this.mockERC20.connect(this.signers.owner).unpause();

    // Check that the wrapper is resumed
    expect(await isPausable.paused()).to.be.false;

    // Now wrapping should succeed again
    await this.confidentialERC20Wrapper.connect(this.signers.alice).wrap(this.signers.alice.address, 1000n);
  });
});
