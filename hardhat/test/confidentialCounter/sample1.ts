import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedCounter1, EncryptedCounter1__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedCounter1")) as EncryptedCounter1__factory;
  const fheEncryptedCounter = (await factory.deploy()) as EncryptedCounter1;
  const fheEncryptedCounterAddress = await fheEncryptedCounter.getAddress();

  return { fheEncryptedCounter, fheEncryptedCounterAddress };
}

describe("EncryptedCounter1", function () {
  let fheEncryptedCounter: EncryptedCounter1;
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

  it("should increment the counter", async function () {
    // Perform the increment action
    const tx = await fheEncryptedCounter.increment();
    await tx.wait();
  });
});
