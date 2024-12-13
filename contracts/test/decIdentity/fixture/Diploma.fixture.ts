import { ethers } from "hardhat";

import type { Diploma, IdMapping } from "../../../types";
import { getSigners } from "../../signers";

export async function deployDiplomaFixture(idMapping: IdMapping): Promise<Diploma> {
  const signers = await getSigners();
  const contractFactory = await ethers.getContractFactory("Diploma");
  const contract = await contractFactory.connect(signers.alice).deploy(idMapping);
  await contract.waitForDeployment();
  return contract;
}
