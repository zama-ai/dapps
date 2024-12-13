import { ethers } from "hardhat";

import type { IdMapping } from "../../../types";
import { getSigners } from "../../signers";

export async function deployIdMappingFixture(): Promise<IdMapping> {
  const signers = await getSigners();

  const IdMappingFactory = await ethers.getContractFactory("IdMapping");
  const idMapping = await IdMappingFactory.connect(signers.alice).deploy();
  await idMapping.waitForDeployment();
  return idMapping;
}
