import { PublicDecryptSingleValue, PublicDecryptSingleValue__factory } from "../../../types";
import type { Signers } from "../../types";
import { HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory(
    "PublicDecryptSingleValue",
  )) as PublicDecryptSingleValue__factory;
  const publicDecryptSingleValue = (await factory.deploy()) as PublicDecryptSingleValue;
  const publicDecryptSingleValue_address = await publicDecryptSingleValue.getAddress();

  return { publicDecryptSingleValue, publicDecryptSingleValue_address };
}

/**
 * This trivial example demonstrates the FHE public decryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("PublicDecryptSingleValue", function () {
  let contract: PublicDecryptSingleValue;
  let signers: Signers;
  let fhevm: HardhatFhevmRuntimeEnvironment;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
    fhevm = hre.fhevm;
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contract = deployment.publicDecryptSingleValue;
  });

  // Test should succeed
  it("public decryption should succeed", async function () {
    let tx = await contract.connect(signers.alice).initializeUint32(123456);
    await tx.wait();

    tx = await contract.requestDecryptSingleUint32();
    await tx.wait();

    const handle = await contract.getHandle();
    const decryptResult = await fhevm.publicDecrypt([handle]);

    tx = await contract.callbackDecryptSingleUint32(
      [handle],
      decryptResult.abiEncodedClearValues,
      decryptResult.decryptionProof,
    );
    await tx.wait();

    const clearUint32 = await contract.clearUint32();
    expect(clearUint32).to.equal(123456 + 1);
  });

  // Test should fail - demonstrates the need for allowThis
  it("decryption should fail without allowThis", async function () {
    const tx = await contract.connect(signers.alice).initializeUint32Wrong(123456);
    await tx.wait();

    const senderNotAllowedError = fhevm.revertedWithCustomErrorArgs("ACL", "SenderNotAllowed");

    await expect(contract.connect(signers.alice).requestDecryptSingleUint32()).to.be.revertedWithCustomError(
      ...senderNotAllowedError,
    );
  });
});
