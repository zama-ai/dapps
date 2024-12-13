import { expect } from "chai";
import { ethers } from "hardhat";

import type { IdMapping } from "../../types";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";
import { deployIdMappingFixture } from "./fixture/IdMapping.fixture";

describe("IdMapping Contract", function () {
  let idMapping: IdMapping;

  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    // Deploy the contract
    idMapping = await deployIdMappingFixture();
    this.idMappingAddress = await idMapping.getAddress();

    // Set up accounts
    this.instances = await createInstance();
  });

  it("Should set the ID for an address", async function () {
    // Set ID for addr1
    await idMapping.generateId();

    // Check if the ID was set correctly
    expect(await idMapping.getId(this.signers.alice)).to.equal(1);
  });

  it("Should set IDs for multiple addresses", async function () {
    // Set IDs for addr1 and addr2
    await idMapping.connect(this.signers.alice).generateId();
    await idMapping.connect(this.signers.bob).generateId();

    // Verify each address has the correct ID
    expect(await idMapping.getId(this.signers.alice)).to.equal(1);
    expect(await idMapping.getId(this.signers.bob)).to.equal(2);
  });

  it("Should retrieve address for a given ID", async function () {
    // Generate ID for alice
    await idMapping.connect(this.signers.alice).generateId();

    // Get alice's address using their ID (1)
    const retrievedAddress = await idMapping.getAddr(1);
    expect(retrievedAddress).to.equal(await this.signers.alice.getAddress());

    // Verify getting an invalid ID reverts
    await expect(idMapping.getAddr(999)).to.be.revertedWithCustomError(idMapping, "InvalidId");
  });

  it("Should not allow generating multiple IDs for same address", async function () {
    await idMapping.connect(this.signers.alice).generateId();
    await expect(idMapping.connect(this.signers.alice).generateId()).to.be.revertedWithCustomError(
      idMapping,
      "IdAlreadyGenerated",
    );
  });

  it("Should fail when getting ID for zero address", async function () {
    await expect(idMapping.getId(ethers.ZeroAddress)).to.be.revertedWithCustomError(idMapping, "InvalidAddress");
  });

  it("Should fail when getting ID for unregistered address", async function () {
    await expect(idMapping.getId(this.signers.alice.address)).to.be.revertedWithCustomError(idMapping, "NoIdGenerated");
  });

  it("Should fail when getting address for invalid ID", async function () {
    await expect(idMapping.getAddr(0)).to.be.revertedWithCustomError(idMapping, "InvalidId");

    await expect(idMapping.getAddr(999)).to.be.revertedWithCustomError(idMapping, "InvalidId");
  });

  it("Should allow owner to reset ID for an address", async function () {
    // Generate ID first
    await idMapping.connect(this.signers.alice).generateId();
    const userId = await idMapping.getId(this.signers.alice.address);

    // Reset ID
    await idMapping.resetIdForAddress(this.signers.alice.address);

    // Verify ID is reset
    await expect(idMapping.getId(this.signers.alice.address)).to.be.revertedWithCustomError(idMapping, "NoIdGenerated");

    await expect(idMapping.getAddr(userId)).to.be.revertedWithCustomError(idMapping, "NoAddressFound");
  });

  it("Should not allow non-owner to reset ID", async function () {
    await idMapping.connect(this.signers.alice).generateId();

    await expect(
      idMapping.connect(this.signers.bob).resetIdForAddress(this.signers.alice.address),
    ).to.be.revertedWithCustomError(idMapping, "OwnableUnauthorizedAccount");
  });

  it("Should not allow resetting ID for unregistered address", async function () {
    await expect(idMapping.resetIdForAddress(this.signers.alice.address)).to.be.revertedWithCustomError(
      idMapping,
      "NoIdGenerated",
    );
  });
});
