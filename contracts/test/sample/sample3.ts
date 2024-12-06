import { expect } from "chai";
import { ethers } from "hardhat";

import { awaitAllDecryptionResults, initGateway } from "../asyncDecrypt";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EncryptedCounter3", function () {
  before(async function () {
    await initSigners(); // Initialize signers
    this.signers = await getSigners();
    await initGateway(); // Initialize the gateway for decryption
  });

  beforeEach(async function () {
    const CounterFactory = await ethers.getContractFactory("EncryptedCounter3");
    this.counterContract = await CounterFactory.connect(this.signers.alice).deploy();
    await this.counterContract.waitForDeployment();
    this.contractAddress = await this.counterContract.getAddress();
    this.instances = await createInstance(); // Set up instances for testing
  });

  it("should increment counter multiple times and decrypt the result", async function () {
    // Create encrypted input for amount to increment by
    const input = this.instances.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add8(5); // Increment by 5 as an example
    const encryptedAmount = await input.encrypt();

    // Call incrementBy with encrypted amount
    const tx = await this.counterContract.incrementBy(encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    const tx4 = await this.counterContract.connect(this.signers.carol).requestDecryptCounter({ gasLimit: 5_000_000 });
    await tx4.wait();

    // Wait for decryption to complete
    await awaitAllDecryptionResults();

    // Check decrypted value (should be 3: initial 0 + three increments)
    const decryptedValue = await this.counterContract.getDecryptedCounter();
    expect(decryptedValue).to.equal(5);
  });
});
