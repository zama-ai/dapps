import { ethers } from "hardhat";

import type { IdMapping, PassportID } from "../../../types";
import { getSigners } from "../../signers";

export async function deployPassportIDFixture(idMapping: IdMapping): Promise<PassportID> {
  const signers = await getSigners();
  const contractFactory = await ethers.getContractFactory("PassportID");
  const contract = await contractFactory.connect(signers.alice).deploy(idMapping);
  await contract.waitForDeployment();
  return contract;
}
