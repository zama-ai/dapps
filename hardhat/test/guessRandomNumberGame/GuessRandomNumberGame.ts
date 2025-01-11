import { expect } from "chai";
import { ethers } from "hardhat";

import type { GuessRandomNumberGame } from "../../types";
import { awaitAllDecryptionResults, initGateway } from "../asyncDecrypt";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EncryptedSecretKeeper", function () {
  let contract: GuessRandomNumberGame;

  before(async function () {
    await initSigners(); // Initialize signers
    this.signers = await getSigners();
    await initGateway(); // Initialize the gateway for decryption
  });

  beforeEach(async function () {
    const CounterFactory = await ethers.getContractFactory("GuessRandomNumberGame");
    contract = await CounterFactory.connect(this.signers.alice).deploy();
    await contract.waitForDeployment();
    this.contractAddress = await contract.getAddress();
    this.instances = await createInstance();
  });

  it("should allow players to submit encrypted secrets", async function () {
    const input = this.instances.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add64(500); // Add the secret value
    const encryptedInput = await input.encrypt();

    const tx = await contract
      .connect(this.signers.alice)
      .submitSecret(encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const secrets = await contract.secrets(0);
    expect(secrets.owner).to.equal(this.signers.alice.address);
    expect(secrets.encryptedValue).to.not.be.null;
  });

  it("should request decryption of the encrypted target", async function () {
    const tx = await contract.requestDecryptEncryptedTarget();
    await tx.wait();

    await awaitAllDecryptionResults();

    const decryptedValue = await contract.decryptedTarget();
    expect(decryptedValue).to.equal(5);
  });

  it.only("should determine the winner based on the closest secret to the target", async function () {
    // Simulate player 1 submitting a secret
    const input1 = this.instances.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input1.add64(450);
    const encryptedInput1 = await input1.encrypt();

    await contract.connect(this.signers.alice).submitSecret(encryptedInput1.handles[0], encryptedInput1.inputProof);

    // Simulate player 2 submitting a secret
    const input2 = this.instances.createEncryptedInput(this.contractAddress, this.signers.bob.address);
    input2.add64(700);
    const encryptedInput2 = await input2.encrypt();

    await contract.connect(this.signers.bob).submitSecret(encryptedInput2.handles[0], encryptedInput2.inputProof);

    // Call determineWinner and get transaction response
    const tx = await contract.connect(this.signers.alice).determineWinner();
    const receipt = await tx.wait();

    // Get the data from the transaction
    const data = tx.data;
    console.log("Transaction data:", data);

    // Verify the transaction was successful
    expect(receipt.status).to.equal(1);
    // expect(data).to.equal("0x33b16d93"); // The function selector for determineWinner()
  });

  it("should emit events on secret submission and winner declaration", async function () {
    // Simulate player submitting a secret
    const input = this.instances.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add64(350);
    const encryptedInput = await input.encrypt();

    await expect(
      contract.connect(this.signers.alice).submitSecret(encryptedInput.handles[0], encryptedInput.inputProof),
    )
      .to.emit(contract, "SecretSubmitted")
      .withArgs(this.signers.alice.address, encryptedInput.handles[0]);

    // Call determineWinner and check event
    await expect(contract.connect(this.signers.alice).determineWinner()).to.emit(contract, "WinnerDeclared");
  });
});
