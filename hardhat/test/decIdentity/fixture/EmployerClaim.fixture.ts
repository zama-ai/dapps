import { ethers } from "hardhat";

import type { Diploma, EmployerClaim, IdMapping, PassportID } from "../../../types";
import { deployDiplomaFixture } from "./Diploma.fixture";
import { deployIdMappingFixture } from "./IdMapping.fixture";
import { deployPassportIDFixture } from "./PassportID.fixture";

export async function deployEmployerClaimFixture(): Promise<{
  employerClaim: EmployerClaim;
  passportID: PassportID;
  diploma: Diploma;
  idMapping: IdMapping;
}> {
  const idMapping = await deployIdMappingFixture();
  const passportID = await deployPassportIDFixture(idMapping);
  const diploma = await deployDiplomaFixture(idMapping);
  const EmployerClaimFactory = await ethers.getContractFactory("EmployerClaim");
  const employerClaim = await EmployerClaimFactory.deploy(idMapping, passportID, diploma);
  await employerClaim.waitForDeployment();
  return { employerClaim, passportID, diploma, idMapping };
}
