import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { Signers } from "../types";
import { deployMockUSDZFixture } from "./mockUSDZ.fixture";

describe("ConfidentialETHWrapper", function () {
  before(async function () {
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }
    this.signers = {} as Signers;

    const signers = await ethers.getSigners();
    this.owner = signers[0];
    this.user = signers[1];
  });

  beforeEach(async function () {
    const deployment = await deployMockUSDZFixture(this.owner);
    this.mockUSDZ = deployment.mockUSDZ;
    this.mockUSDZAddress = deployment.mockUSDZ_address;
  });

  it("can mint USDZ", async function () {
    
    // Check User balance
    expect(await this.mockUSDZ.balanceOf(this.user.address)).to.equal(0);

    // Mint USDZ for User
    await this.mockUSDZ.connect(this.user).mint(this.user.address);

    // Check User balance
    expect(await this.mockUSDZ.balanceOf(this.user.address)).to.equal(10 * 1e6);
    expect(await this.mockUSDZ.paused()).to.equal(false);
  });

  it("pause mint USDZ", async function () {
    expect(await this.mockUSDZ.paused()).to.equal(false);

    // Pause the contract
    await this.mockUSDZ.connect(this.owner).pause();
    expect(await this.mockUSDZ.paused()).to.equal(true);

    // Mint should revert
    await expect(
      this.mockUSDZ.connect(this.user).mint(this.user.address)
    ).to.be.revertedWithCustomError(this.mockUSDZ, "EnforcedPause");

    // Unpause the contract
    await this.mockUSDZ.connect(this.owner).unpause();
    expect(await this.mockUSDZ.paused()).to.equal(false);

    // Mint USDZ should work again
    await this.mockUSDZ.connect(this.user).mint(this.user.address);
    expect(await this.mockUSDZ.balanceOf(this.user.address)).to.equal(10 * 1e6);
  });


  it("only owner can pause and unpause", async function () {

    // Try to pause again as user, should revert
    await expect(this.mockUSDZ.connect(this.user).pause())
      .to.be.revertedWithCustomError(this.mockUSDZ, "OwnableUnauthorizedAccount")
      .withArgs(this.user.address);
    expect(await this.mockUSDZ.paused()).to.equal(false);

    // Pause the contract
    await this.mockUSDZ.connect(this.owner).pause();
    expect(await this.mockUSDZ.paused()).to.equal(true);

    // Try to unpause again as user, should revert
    await expect(this.mockUSDZ.connect(this.user).unpause())
      .to.be.revertedWithCustomError(this.mockUSDZ, "OwnableUnauthorizedAccount")
      .withArgs(this.user.address);

    // Unpause the contract
    await this.mockUSDZ.connect(this.owner).unpause();
    expect(await this.mockUSDZ.paused()).to.equal(false);
  });

});
