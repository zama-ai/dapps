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

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contract = deployment.publicDecryptSingleValue;
  });

  // ✅ Test should succeed
  it("public decryption should succeed", async function () {
    let tx = await contract.connect(signers.alice).initializeUint32(123456);
    await tx.wait();

    tx = await contract.requestDecryptSingleUint32();
    await tx.wait();

    // We use the FHEVM Hardhat plugin to simulate the asynchronous onchain
    // public decryption
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    // Use the built-in `awaitDecryptionOracle` helper to wait for the FHEVM public decryption oracle
    // to complete all pending Solidity public decryption requests.
    await fhevm.awaitDecryptionOracle();

    // At this point, the Solidity callback should have been invoked by the FHEVM backend.
    // We can now retrieve the decrypted (clear) value.
    const clearUint32 = await contract.clearUint32();

    expect(clearUint32).to.equal(123456 + 1);
  });

  // ❌ Test should fail
  it("decryption should fail", async function () {
    const tx = await contract.connect(signers.alice).initializeUint32Wrong(123456);
    await tx.wait();

    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    const senderNotAllowedError = fhevm.revertedWithCustomErrorArgs("ACL", "SenderNotAllowed");

    await expect(contract.connect(signers.alice).requestDecryptSingleUint32()).to.be.revertedWithCustomError(
      ...senderNotAllowedError,
    );
  });
});