import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { toBufferBE } from "bigint-buffer";
import { expect } from "chai";
import type { FhevmInstance } from "fhevmjs";

import type { Diploma, EmployerClaim, IdMapping, PassportID } from "../../types";
import { createInstance } from "../instance";
import { reencryptEbool, reencryptEbytes64, reencryptEuint8, reencryptEuint16 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";
import { bigIntToBytes64 } from "../utils";
import { deployEmployerClaimFixture } from "./fixture/EmployerClaim.fixture";

/**
 * Utility function to convert a bigint value to a 256-bit byte array
 * @param value - The bigint value to convert
 * @returns A Uint8Array representing the 256-bit byte array
 */
export const bigIntToBytes256 = (value: bigint) => {
  return new Uint8Array(toBufferBE(value, 256));
};

/**
 * Integration test suite for PassportID and EmployerClaim contracts
 * Tests the core functionality of diploma registration, verification and claim generation
 */
describe("Diploma", function () {
  let passportID: PassportID;
  let employerClaim: EmployerClaim;
  let diplomaID: Diploma;
  let idMapping: IdMapping;

  /**
   * Initialize test signers before running any tests
   * Sets up alice and other signers that will be used across test cases
   */
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  /**
   * Deploy fresh contract instances before each test
   * Sets up clean state with new PassportID, EmployerClaim, Diploma and IdMapping contracts
   */
  beforeEach(async function () {
    const deployment = await deployEmployerClaimFixture();
    employerClaim = deployment.employerClaim;
    passportID = deployment.passportID;
    diplomaID = deployment.diploma;
    idMapping = deployment.idMapping;

    this.employerClaimAddress = await employerClaim.getAddress();
    this.diplomaAddress = await diplomaID.getAddress();
    this.passportIDAddress = await passportID.getAddress();
    this.idMappingAddress = await idMapping.getAddress();

    this.instances = await createInstance();
  });

  /**
   * Helper function to register a diploma for a user
   */
  async function registerDiploma(
    userId: bigint,
    instance: FhevmInstance,
    diplomaAddress: string,
    signer: HardhatEthersSigner,
    university = bigIntToBytes64(8n),
    degree = 8,
    grade = bigIntToBytes64(8n),
  ) {
    const input = instance.createEncryptedInput(diplomaAddress, signer.address);
    const encryptedData = await input.addBytes64(university).add16(degree).addBytes64(grade).encrypt();

    await diplomaID
      .connect(signer)
      .registerDiploma(
        userId,
        encryptedData.handles[0],
        encryptedData.handles[1],
        encryptedData.handles[2],
        encryptedData.inputProof,
      );
  }

  // /**
  //  * Helper function to setup reencryption
  //  */
  // async function setupReencryption(instance: FhevmInstance, signer: HardhatEthersSigner, contractAddress: string) {
  //   const { publicKey, privateKey } = instance.generateKeypair();
  //   const eip712 = instance.createEIP712(publicKey, contractAddress);
  //   const signature = await signer.signTypedData(eip712.domain, { Reencrypt: eip712.types.Reencrypt }, eip712.message);

  //   return { publicKey, privateKey, signature: signature.replace("0x", "") };
  // }

  /**
   * Helper function to register identity
   */
  async function registerIdentity(
    userId: bigint,
    instance: FhevmInstance,
    passportAddress: string,
    signer: HardhatEthersSigner,
    biodata = bigIntToBytes64(8n),
    firstname = bigIntToBytes64(8n),
    lastname = bigIntToBytes64(8n),
    birthdate = 946681200n, // Sat Jan 01 2000 - 24 years old
  ) {
    const input = instance.createEncryptedInput(passportAddress, signer.address);
    const encryptedData = await input
      .addBytes64(biodata)
      .addBytes64(firstname)
      .addBytes64(lastname)
      .add64(birthdate)
      .encrypt();

    await passportID
      .connect(signer)
      .registerIdentity(
        userId,
        encryptedData.handles[0],
        encryptedData.handles[1],
        encryptedData.handles[2],
        encryptedData.handles[3],
        encryptedData.inputProof,
      );
  }

  it("should register an identity successfully", async function () {
    await idMapping.connect(this.signers.alice).generateId();
    const userId = await idMapping.getId(this.signers.alice);

    await registerDiploma(userId, this.instances, this.diplomaAddress, this.signers.alice);

    expect(await diplomaID.registered(userId));
  });

  it("should prevent duplicate registration for the same user", async function () {
    await idMapping.connect(this.signers.alice).generateId();
    const userId = await idMapping.getId(this.signers.alice);

    await registerDiploma(userId, this.instances, this.diplomaAddress, this.signers.alice);

    await expect(
      registerDiploma(userId, this.instances, this.diplomaAddress, this.signers.alice),
    ).to.be.revertedWithCustomError(diplomaID, "DiplomaAlreadyRegistered");
  });

  it("should retrieve the registered identity", async function () {
    await idMapping.connect(this.signers.alice).generateId();
    const userId = await idMapping.getId(this.signers.alice);

    await registerDiploma(userId, this.instances, this.diplomaAddress, this.signers.alice);

    const universityHandleAlice = await diplomaID.getMyUniversity(userId);

    const reencryptedUniversity = await reencryptEbytes64(
      this.signers.alice,
      this.instances,
      universityHandleAlice,
      this.diplomaAddress,
    );

    expect(reencryptedUniversity).to.equal(8);
  });

  it("should generate an degree claim", async function () {
    await idMapping.connect(this.signers.alice).generateId();
    const userId = await idMapping.getId(this.signers.alice);

    await registerDiploma(userId, this.instances, this.diplomaAddress, this.signers.alice);

    const tx = await diplomaID
      .connect(this.signers.alice)
      .generateClaim(this.employerClaimAddress, "generateDegreeClaim(uint256)");

    await expect(tx).to.emit(employerClaim, "DegreeClaimGenerated");

    const latestClaimUserId = await employerClaim.lastClaimId();
    const degreeClaim = await employerClaim.getDegreeClaim(latestClaimUserId);

    const reencryptedDegreeClaim = await reencryptEbool(
      this.signers.alice,
      this.instances,
      degreeClaim,
      this.diplomaAddress,
    );

    expect(reencryptedDegreeClaim).to.equal(0);
  });

  it("should generate both degree and adult claims", async function () {
    await idMapping.connect(this.signers.alice).generateId();
    const userId = await idMapping.getId(this.signers.alice);

    await registerDiploma(
      userId,
      this.instances,
      this.diplomaAddress,
      this.signers.alice,
      bigIntToBytes64(8n),
      3, // Computer Science (B.Sc)
      bigIntToBytes64(8n),
    );

    const degreeTx = await diplomaID
      .connect(this.signers.alice)
      .generateClaim(this.employerClaimAddress, "generateDegreeClaim(uint256)");

    await expect(degreeTx).to.emit(employerClaim, "DegreeClaimGenerated");

    const latestDegreeClaimUserId = await employerClaim.lastClaimId();
    const degreeClaim = await employerClaim.getDegreeClaim(latestDegreeClaimUserId);

    await registerIdentity(userId, this.instances, this.passportIDAddress, this.signers.alice);

    const adultTx = await passportID
      .connect(this.signers.alice)
      .generateClaim(this.employerClaimAddress, "generateAdultClaim(uint256)");

    await expect(adultTx).to.emit(employerClaim, "AdultClaimGenerated");

    const latestAdultClaimUserId = await employerClaim.lastClaimId();
    const adultClaim = await employerClaim.getAdultClaim(latestAdultClaimUserId);

    const reencryptedDegreeClaim = await reencryptEbool(
      this.signers.alice,
      this.instances,
      degreeClaim,
      this.diplomaAddress,
    );

    const reencryptedAdultClaim = await reencryptEbool(
      this.signers.alice,
      this.instances,
      adultClaim,
      this.diplomaAddress,
    );

    expect(reencryptedDegreeClaim).to.equal(1);
    expect(reencryptedAdultClaim).to.equal(1);

    await employerClaim.verifyClaims(userId, latestAdultClaimUserId, latestDegreeClaimUserId);
    const verifyResult = await employerClaim.getVerifyClaim(userId);

    const reencryptedVerifyResult = await reencryptEbool(
      this.signers.alice,
      this.instances,
      verifyResult,
      this.diplomaAddress,
    );

    expect(reencryptedVerifyResult).to.equal(1);
  });

  it("should not allow generating claims without a registered ID", async function () {
    // Try to generate degree claim without registering ID first
    await expect(
      diplomaID.connect(this.signers.alice).generateClaim(this.employerClaimAddress, "generateDegreeClaim(uint256)"),
    ).to.be.revertedWithCustomError(idMapping, "NoIdGenerated");

    // Try to generate adult claim without registering ID first
    await expect(
      passportID.connect(this.signers.alice).generateClaim(this.employerClaimAddress, "generateAdultClaim(uint256)"),
    ).to.be.revertedWithCustomError(idMapping, "NoIdGenerated");
  });

  it("should not allow generating claims with unregistered diploma/identity", async function () {
    // Generate ID but don't register diploma/identity
    await idMapping.connect(this.signers.alice).generateId();
    const userId = await idMapping.getId(this.signers.alice);

    // Try to generate degree claim without registering diploma
    await expect(
      diplomaID.connect(this.signers.alice).generateClaim(this.employerClaimAddress, "generateDegreeClaim(uint256)"),
    ).to.be.revertedWith("sender isn't allowed");

    // Try to generate adult claim without registering identity
    await expect(
      passportID.connect(this.signers.alice).generateClaim(this.employerClaimAddress, "generateAdultClaim(uint256)"),
    ).to.be.revertedWith("sender isn't allowed");
  });

  it("should allow admin to add a new registrar for diplomaID and passportID", async function () {
    // Test diplomaID
    await expect(diplomaID.connect(this.signers.alice).addRegistrar(this.signers.bob.address))
      .to.emit(diplomaID, "RoleGranted")
      .withArgs(await diplomaID.REGISTRAR_ROLE(), this.signers.bob.address, this.signers.alice.address);

    expect(await diplomaID.hasRole(await diplomaID.REGISTRAR_ROLE(), this.signers.bob.address)).to.be.true;

    // Test passportID
    await expect(passportID.connect(this.signers.alice).addRegistrar(this.signers.bob.address))
      .to.emit(passportID, "RoleGranted")
      .withArgs(await passportID.REGISTRAR_ROLE(), this.signers.bob.address, this.signers.alice.address);

    expect(await passportID.hasRole(await passportID.REGISTRAR_ROLE(), this.signers.bob.address)).to.be.true;
  });

  it("should allow admin to remove a registrar from diplomaID and passportID", async function () {
    // Test diplomaID
    await diplomaID.connect(this.signers.alice).addRegistrar(this.signers.bob.address);
    await expect(diplomaID.connect(this.signers.alice).removeRegistrar(this.signers.bob.address))
      .to.emit(diplomaID, "RoleRevoked")
      .withArgs(await diplomaID.REGISTRAR_ROLE(), this.signers.bob.address, this.signers.alice.address);

    expect(await diplomaID.hasRole(await diplomaID.REGISTRAR_ROLE(), this.signers.bob.address)).to.be.false;

    // Test passportID
    await passportID.connect(this.signers.alice).addRegistrar(this.signers.bob.address);
    await expect(passportID.connect(this.signers.alice).removeRegistrar(this.signers.bob.address))
      .to.emit(passportID, "RoleRevoked")
      .withArgs(await passportID.REGISTRAR_ROLE(), this.signers.bob.address, this.signers.alice.address);

    expect(await passportID.hasRole(await passportID.REGISTRAR_ROLE(), this.signers.bob.address)).to.be.false;
  });

  it("should not allow non-admin to add a registrar to diplomaID and passportID", async function () {
    // Test diplomaID
    await expect(
      diplomaID.connect(this.signers.carol).addRegistrar(this.signers.carol.address),
    ).to.be.revertedWithCustomError(diplomaID, "AccessControlUnauthorizedAccount");

    // Test passportID
    await expect(
      passportID.connect(this.signers.carol).addRegistrar(this.signers.carol.address),
    ).to.be.revertedWithCustomError(passportID, "AccessControlUnauthorizedAccount");
  });

  it("should not allow non-admin to remove a registrar from diplomaID and passportID", async function () {
    // Test diplomaID
    await diplomaID.connect(this.signers.alice).addRegistrar(this.signers.bob.address);
    await expect(
      diplomaID.connect(this.signers.carol).removeRegistrar(this.signers.bob.address),
    ).to.be.revertedWithCustomError(diplomaID, "AccessControlUnauthorizedAccount");
    await diplomaID.connect(this.signers.alice).removeRegistrar(this.signers.bob.address);

    // Test passportID
    await passportID.connect(this.signers.alice).addRegistrar(this.signers.bob.address);
    await expect(
      passportID.connect(this.signers.carol).removeRegistrar(this.signers.bob.address),
    ).to.be.revertedWithCustomError(passportID, "AccessControlUnauthorizedAccount");
    await passportID.connect(this.signers.alice).removeRegistrar(this.signers.bob.address);
  });
});
