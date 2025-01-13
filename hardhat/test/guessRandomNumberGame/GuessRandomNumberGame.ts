import { expect } from "chai";
import { ethers } from "hardhat";

import type { GuessRandomNumberGame } from "../../types";
import { awaitAllDecryptionResults, initGateway } from "../asyncDecrypt";
import { createInstance } from "../instance";
import { reencryptEuint16 } from "../reencrypt";
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
    contract = await CounterFactory.connect(this.signers.alice).deploy(2, 1024); // minPlayers: 2
    await contract.waitForDeployment();
    this.contractAddress = await contract.getAddress();
    this.instances = await createInstance();
  });

  it("should allow players to submit encrypted guesss", async function () {
    const input = this.instances.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add16(500); // Add the guess value
    const encryptedInput = await input.encrypt();

    const tx = await contract
      .connect(this.signers.alice)
      .submitGuess(encryptedInput.handles[0], encryptedInput.inputProof);
    await tx.wait();

    const guesss = await contract.guesses(0);
    expect(guesss.owner).to.equal(this.signers.alice.address);
    expect(guesss.encryptedValue).to.not.be.null;
  });

  it("should request decryption and revert", async function () {
    await expect(contract.determineWinner()).to.be.revertedWith("Not enough players have submitted guesses");
  });

  it("should determine the winner based on the closest guess to the target", async function () {
    // Simulate player 1 submitting a guess
    const input1 = this.instances.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input1.add16(450);
    const encryptedInput1 = await input1.encrypt();

    await contract.connect(this.signers.alice).submitGuess(encryptedInput1.handles[0], encryptedInput1.inputProof);

    // Simulate player 2 submitting a guess
    const input2 = this.instances.createEncryptedInput(this.contractAddress, this.signers.bob.address);
    input2.add16(700);
    const encryptedInput2 = await input2.encrypt();

    await contract.connect(this.signers.bob).submitGuess(encryptedInput2.handles[0], encryptedInput2.inputProof);

    // Call determineWinner and get transaction response
    const tx = await contract.connect(this.signers.alice).determineWinner();
    await tx.wait();

    await awaitAllDecryptionResults();

    const decryptedValue = await contract.decryptedPreviousTarget();
    expect(decryptedValue).to.be.within(0, 1024);
    // console.log("decrypted Value: ", decryptedValue);
    const closestValue = await contract.closestPreviousWinningValueDecrypted();
    // console.log("closest value: ", closestValue);
    const closestOwnerDecrypted = await contract.closestPreviousWinnerDecrypted();
    // console.log("closest Owner: ", closestOwnerDecrypted);
    expect(closestOwnerDecrypted).to.be.oneOf([this.signers.bob.address, this.signers.alice.address]);
  });

  it("should emit events on guess submission", async function () {
    // Simulate player submitting a guess
    const input = this.instances.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add16(350);
    const encryptedInput = await input.encrypt();

    await expect(contract.connect(this.signers.alice).submitGuess(encryptedInput.handles[0], encryptedInput.inputProof))
      .to.emit(contract, "GuessSubmitted")
      .withArgs(this.signers.alice.address, encryptedInput.handles[0]);
  });

  it("should allow retrieving encrypted guess for caller", async function () {
    // Submit a guess first
    const input = this.instances.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add16(123);
    const encryptedInput = await input.encrypt();

    await contract.connect(this.signers.alice).submitGuess(encryptedInput.handles[0], encryptedInput.inputProof);

    // Get the guess back
    const mySecret = await contract.connect(this.signers.alice).getMyGuess();
    expect(mySecret).to.not.be.null;

    const decryptedValue = await reencryptEuint16(this.signers.alice, this.instances, mySecret, this.contractAddress);

    expect(decryptedValue).to.equal(123);
  });

  it("should be able to play the game twice", async function () {
    // First game
    // Simulate player 1 submitting a guess
    const input1 = this.instances.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input1.add16(450);
    const encryptedInput1 = await input1.encrypt();

    await contract.connect(this.signers.alice).submitGuess(encryptedInput1.handles[0], encryptedInput1.inputProof);

    // Simulate player 2 submitting a guess
    const input2 = this.instances.createEncryptedInput(this.contractAddress, this.signers.bob.address);
    input2.add16(700);
    const encryptedInput2 = await input2.encrypt();

    await contract.connect(this.signers.bob).submitGuess(encryptedInput2.handles[0], encryptedInput2.inputProof);

    // Call determineWinner and get transaction response
    let tx = await contract.connect(this.signers.alice).determineWinner();
    await tx.wait();

    await awaitAllDecryptionResults();

    let decryptedValue = await contract.decryptedPreviousTarget();
    expect(decryptedValue).to.be.within(0, 1024);
    // console.log("First game decrypted Value: ", decryptedValue);
    let closestValue = await contract.closestPreviousWinningValueDecrypted();
    // console.log("First game closest value: ", closestValue);
    let closestOwnerDecrypted = await contract.closestPreviousWinnerDecrypted();
    // console.log("First game closest Owner: ", closestOwnerDecrypted);
    expect(closestOwnerDecrypted).to.be.oneOf([this.signers.bob.address, this.signers.alice.address]);

    // Second game
    // Simulate player 1 submitting a new guess
    const input3 = this.instances.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input3.add16(300);
    const encryptedInput3 = await input3.encrypt();

    await contract.connect(this.signers.alice).submitGuess(encryptedInput3.handles[0], encryptedInput3.inputProof);

    // Simulate player 2 submitting a new guess
    const input4 = this.instances.createEncryptedInput(this.contractAddress, this.signers.bob.address);
    input4.add16(800);
    const encryptedInput4 = await input4.encrypt();

    await contract.connect(this.signers.bob).submitGuess(encryptedInput4.handles[0], encryptedInput4.inputProof);

    // Call determineWinner for second game
    tx = await contract.connect(this.signers.alice).determineWinner();
    await tx.wait();

    await awaitAllDecryptionResults();

    decryptedValue = await contract.decryptedPreviousTarget();
    expect(decryptedValue).to.be.within(0, 1024);
    // console.log("Second game decrypted Value: ", decryptedValue);
    closestValue = await contract.closestPreviousWinningValueDecrypted();
    // console.log("Second game closest value: ", closestValue);
    closestOwnerDecrypted = await contract.closestPreviousWinnerDecrypted();
    // console.log("Second game closest Owner: ", closestOwnerDecrypted);
    expect(closestOwnerDecrypted).to.be.oneOf([this.signers.bob.address, this.signers.alice.address]);
  });
});
