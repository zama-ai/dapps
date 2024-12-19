import { ethers } from "hardhat";

import type { FHEWordle, FHEWordleFactory } from "../../types";
import { getSigners } from "../signers";

/**
 * Deploys FHEWordle and FHEWordleFactory contracts.
 * @returns Deployed instances of FHEWordle and FHEWordleFactory.
 */
export async function deployFHEWordleFixture(): Promise<{
  wordleContract: FHEWordle;
  wordleFactory: FHEWordleFactory;
}> {
  const signers = await getSigners();

  // Deploy FHEWordle contract
  const WordleFactory = await ethers.getContractFactory("FHEWordle");
  const wordleContract = (await WordleFactory.connect(signers.alice).deploy()) as FHEWordle;
  await wordleContract.waitForDeployment();

  // Deploy FHEWordleFactory contract
  const FactoryContract = await ethers.getContractFactory("FHEWordleFactory");
  const wordleFactory = (await FactoryContract.connect(signers.alice).deploy(
    await wordleContract.getAddress(),
  )) as FHEWordleFactory;
  await wordleFactory.waitForDeployment();

  return { wordleContract, wordleFactory };
}
