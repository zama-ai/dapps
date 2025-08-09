import { ethers } from "hardhat";

import type { MockUSDZ, MockUSDZ__factory } from "../../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export async function deployMockUSDZFixture(owner: HardhatEthersSigner) {
  // Contracts are deployed using the first signer/account by default
  const MockUSDZFactory = (await ethers.getContractFactory("MockUSDZ")) as MockUSDZ__factory;
  const mockUSDZ = (await MockUSDZFactory.connect(owner).deploy("USDZ", "USDZ")) as MockUSDZ;
  const mockUSDZ_address = await mockUSDZ.getAddress();

  return { mockUSDZ, mockUSDZ_address };
}
