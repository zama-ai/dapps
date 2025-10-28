import { PublicDecryptMultipleValues, PublicDecryptMultipleValues__factory } from "../../../types";
import type { Signers } from "../../types";
import { HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory(
    "PublicDecryptMultipleValues",
  )) as PublicDecryptMultipleValues__factory;
  const publicDecryptMultipleValues = (await factory.deploy()) as PublicDecryptMultipleValues;
  const publicDecryptMultipleValues_address = await publicDecryptMultipleValues.getAddress();

  return { publicDecryptMultipleValues, publicDecryptMultipleValues_address };
}

/**
 * This trivial example demonstrates the FHE public decryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("PublicDecryptMultipleValues", function () {
  let contract: PublicDecryptMultipleValues;
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
    contract = deployment.publicDecryptMultipleValues;
  });

  // ✅ Test should succeed
  it("public decryption should succeed", async function () {
    // For simplicity, we create 3 trivialy encrypted values onchain.
    let tx = await contract.connect(signers.alice).initialize(true, 123456, 78901234567);
    await tx.wait();

    tx = await contract.requestDecryptMultipleValues();
    await tx.wait();

    // We use the FHEVM Hardhat plugin to simulate the asynchronous onchain
    // public decryption
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    // Use the built-in `awaitDecryptionOracle` helper to wait for the FHEVM public decryption oracle
    // to complete all pending Solidity public decryption requests.
    await fhevm.awaitDecryptionOracle();

    // At this point, the Solidity callback should have been invoked by the FHEVM backend.
    // We can now retrieve the 3 publicly decrypted (clear) values.
    const clearBool = await contract.clearBool();
    const clearUint32 = await contract.clearUint32();
    const clearUint64 = await contract.clearUint64();

    expect(clearBool).to.equal(true);
    expect(clearUint32).to.equal(123456 + 1);
    expect(clearUint64).to.equal(78901234567 + 1);
  });
});