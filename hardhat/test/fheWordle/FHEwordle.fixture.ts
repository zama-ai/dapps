import { ethers } from "hardhat";

import type { FHEWordle, FHEWordleFactory } from "../../types";
/**
 * Deploys FHEWordle and FHEWordleFactory contracts.
 * @returns Deployed instances of FHEWordle and FHEWordleFactory.
 */
export async function deployFHEWordleFixture(): Promise<{
  wordleContract: FHEWordle;
  wordleFactory: FHEWordleFactory;
}> {
  // Deploy FHEWordle contract
  const WordleFactory = await ethers.getContractFactory("FHEWordle");
  const wordleContract = (await WordleFactory.deploy()) as FHEWordle;
  await wordleContract.waitForDeployment();

  // Deploy FHEWordleFactory contract
  const FactoryContract = await ethers.getContractFactory("FHEWordleFactory");
  const wordleFactory = (await FactoryContract.deploy(await wordleContract.getAddress())) as FHEWordleFactory;
  await wordleFactory.waitForDeployment();

  return { wordleContract, wordleFactory };
}
