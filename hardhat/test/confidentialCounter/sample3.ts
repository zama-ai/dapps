import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedCounter3, EncryptedCounter3__factory } from "../../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedCounter3")) as EncryptedCounter3__factory;
  const fheEncryptedCounter = (await factory.deploy()) as EncryptedCounter3;
  const fheEncryptedCounterAddress = await fheEncryptedCounter.getAddress();

  return { fheEncryptedCounter, fheEncryptedCounterAddress };
}

describe("EncryptedCounter3", function () {
  let fheEncryptedCounter: EncryptedCounter3;
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

  it("should increment counter and decrypt the result", async function () {
    // Create encrypted input for amount to increment by
    const input = fhevm.createEncryptedInput(fheEncryptedCounterAddress, this.signers.deployer.address);
    input.add8(5);
    const encryptedAmount = await input.encrypt();

    // Call incrementBy with encrypted amount
    const tx = await fheEncryptedCounter.incrementBy(encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();

    const tx4 = await fheEncryptedCounter.connect(this.signers.bob).requestDecryptCounter();
    await tx4.wait();

    // Wait for decryption to complete
    await fhevm.awaitDecryptionOracle();

    // Check decrypted value (should be 3: initial 0 + three increments)
    const decryptedValue = await fheEncryptedCounter.getDecryptedCounter();
    expect(decryptedValue).to.equal(5);
  });
});
