import { ethers } from "hardhat";
import type { ConfidentialTokenExample } from "../../types";
import type { ConfidentialTokenExample__factory } from "../../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export async function deployConfidentialTokenExampleFixture(owner: HardhatEthersSigner) {
  // Deploy ConfidentialTokenExample with initial supply
  const ConfidentialTokenExampleFactory = (await ethers.getContractFactory(
    "ConfidentialTokenExample",
  )) as ConfidentialTokenExample__factory;
  const ConfidentialTokenExample = (await ConfidentialTokenExampleFactory.deploy(
    1000, // Initial amount
    "Confidential Token",
    "CTKN",
    "https://example.com/token",
  )) as ConfidentialTokenExample;

  const ConfidentialTokenExampleAddress = await ConfidentialTokenExample.getAddress();

  return {
    ConfidentialTokenExample,
    ConfidentialTokenExampleAddress,
  };
}
