import { ethers } from "hardhat";
import type { ERC7984Example } from "../../types";
import type { ERC7984Example__factory } from "../../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export async function deployERC7984ExampleFixture(owner: HardhatEthersSigner) {
  // Deploy ERC7984Example with initial supply
  const ERC7984ExampleFactory = (await ethers.getContractFactory(
    "ERC7984Example",
  )) as ERC7984Example__factory;
  const ERC7984Example = (await ERC7984ExampleFactory.deploy(
    1000, // Initial amount
    "Confidential Token",
    "CTKN",
    "https://example.com/token",
  )) as ERC7984Example;

  const ERC7984ExampleAddress = await ERC7984Example.getAddress();

  return {
    ERC7984Example,
    ERC7984ExampleAddress,
  };
}
