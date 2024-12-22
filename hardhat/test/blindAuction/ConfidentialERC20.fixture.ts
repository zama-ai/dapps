import { ethers } from "hardhat";

import type { BlindAuctionConfidentialERC20 } from "../../types";
import { getSigners } from "../signers";

export async function deployConfidentialERC20Fixture(): Promise<BlindAuctionConfidentialERC20> {
  const signers = await getSigners();

  const contractFactory = await ethers.getContractFactory("BlindAuctionConfidentialERC20");
  const contract = await contractFactory.connect(signers.alice).deploy("Naraggara", "NARA"); // City of Zama's battle
  await contract.waitForDeployment();

  return contract;
}
