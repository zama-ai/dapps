import { FhevmType, HardhatFhevmRuntimeEnvironment } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import { FHEAdd, FHEAdd__factory } from "../../../types";
import type { Signers } from "../../types";

async function deployFixture() {
  // Contracts are deployed using the first signer/account by default
  const factory = (await ethers.getContractFactory("FHEAdd")) as FHEAdd__factory;
  const fheAdd = (await factory.deploy()) as FHEAdd;
  const fheAdd_address = await fheAdd.getAddress();

  return { fheAdd, fheAdd_address };
}

/**
 * This trivial example demonstrates the FHE encryption mechanism
 * and highlights a common pitfall developers may encounter.
 */
describe("FHEAdd", function () {
  let contract: FHEAdd;
  let contractAddress: string;
  let signers: Signers;
  let bob: HardhatEthersSigner;

  before(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!hre.fhevm.isMock) {
      throw new Error(`This hardhat test suite cannot run on Sepolia Testnet`);
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], alice: ethSigners[1] };
    bob = ethSigners[2];
  });

  beforeEach(async function () {
    // Deploy a new contract each time we run a new test
    const deployment = await deployFixture();
    contractAddress = deployment.fheAdd_address;
    contract = deployment.fheAdd;
  });

  it("a + b should succeed", async function () {
    const fhevm: HardhatFhevmRuntimeEnvironment = hre.fhevm;

    let tx;

    // Let's compute 80 + 123 = 203
    const a = 80;
    const b = 123;

    // Alice encrypts and sets `a` as 80
    const inputA = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(a).encrypt();
    tx = await contract.connect(signers.alice).setA(inputA.handles[0], inputA.inputProof);
    await tx.wait();

    // Alice encrypts and sets `b` as 203
    const inputB = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(b).encrypt();
    tx = await contract.connect(signers.alice).setB(inputB.handles[0], inputB.inputProof);
    await tx.wait();

    // Why Bob has FHE permissions to execute the operation in this case ?
    // See `computeAPlusB()` in `FHEAdd.sol` for a detailed answer
    tx = await contract.connect(bob).computeAPlusB();
    await tx.wait();

    const encryptedAplusB = await contract.result();

    const clearAplusB = await fhevm.userDecryptEuint(
      FhevmType.euint8, // Specify the encrypted type
      encryptedAplusB,
      contractAddress, // The contract address
      bob, // The user wallet
    );

    expect(clearAplusB).to.equal(a + b);
  });
});
