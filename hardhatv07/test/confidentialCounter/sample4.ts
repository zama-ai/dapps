import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedCounter4, EncryptedCounter4__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedCounter4")) as EncryptedCounter4__factory;
  const fheEncryptedCounter = (await factory.deploy()) as EncryptedCounter4;
  const fheEncryptedCounterAddress = await fheEncryptedCounter.getAddress();

  return { fheEncryptedCounter, fheEncryptedCounterAddress };
}

describe("EncryptedCounter4", function () {
  let fheEncryptedCounter: EncryptedCounter4;
  let fheEncryptedCounterAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    this.signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ fheEncryptedCounter, fheEncryptedCounterAddress } = await deployFixture());
  });

  it("should allow reencryption and decryption of counter value", async function () {
    const input = fhevm.createEncryptedInput(fheEncryptedCounterAddress, this.signers.deployer.address);
    input.add8(5);
    const encryptedAmount = await input.encrypt();

    // Call incrementBy with encrypted amount
    const tx = await fheEncryptedCounter.incrementBy(encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    // Get the encrypted counter value
    const encryptedCounter = await fheEncryptedCounter.getCounter();

    const decryptedValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedCounter,
      fheEncryptedCounter,
      this.signers.deployer,
    );

    // Verify the decrypted value is 5 (since we incremented once)
    expect(decryptedValue).to.equal(5);
  });

  it("should allow reencryption of counter value", async function () {
    const input = fhevm.createEncryptedInput(fheEncryptedCounterAddress, this.signers.bob.address);
    input.add8(1); // Increment by 1 as an example
    const encryptedAmount = await input.encrypt();

    // Call incrementBy with encrypted amount
    const tx = await fheEncryptedCounter
      .connect(this.signers.bob)
      .incrementBy(encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    // Get the encrypted counter value
    const encryptedCounter = await fheEncryptedCounter.connect(this.signers.bob).getCounter();


    const decryptedValue = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedCounter,
      fheEncryptedCounter,
      this.signers.bob,
    );

    // Verify the decrypted value is 1 (since we incremented once)
    expect(decryptedValue).to.equal(1);
  });
});
