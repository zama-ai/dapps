import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { EncryptedCounter2, EncryptedCounter2__factory } from "../../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("EncryptedCounter2")) as EncryptedCounter2__factory;
  const fheEncryptedCounter = (await factory.deploy()) as EncryptedCounter2;
  const fheEncryptedCounterAddress = await fheEncryptedCounter.getAddress();

  return { fheEncryptedCounter, fheEncryptedCounterAddress };
}

describe("EncryptedCounter2", function () {
  let fheEncryptedCounter: EncryptedCounter2;
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

  it("should increment by arbitrary encrypted amount", async function () {
    // Create encrypted input for amount to increment by
    const input = fhevm.createEncryptedInput(fheEncryptedCounterAddress, this.signers.deployer.address);
    input.add8(5);
    const encryptedAmount = await input.encrypt();

    // Call incrementBy with encrypted amount
    const tx = await fheEncryptedCounter.incrementBy(encryptedAmount.handles[0], encryptedAmount.inputProof);
    await tx.wait();
  });
});
