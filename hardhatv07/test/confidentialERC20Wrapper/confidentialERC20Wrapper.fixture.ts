import { ethers } from "hardhat";

import type { MockUSDZ } from "../../types";
import type { MockUSDZ__factory } from "../../types";

import type { ERC20Wrapper } from "../../types";
import type { ERC20Wrapper__factory } from "../../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export async function deployConfidentialERC20WrapperFixture(owner: HardhatEthersSigner) {
  
  // Create a mock ERC20
  const MockERC20Factory = (await ethers.getContractFactory("MockUSDZ")) as MockUSDZ__factory;
  const mockERC20 = (await MockERC20Factory.deploy(
    "USDC",
    "USDC"
  )) as MockUSDZ;
  const mockERC20_address = await mockERC20.getAddress();

  // Contracts are deployed using the first signer/account by default
  const ConfidentialERC20WrapperFactory = (await ethers.getContractFactory("ERC20Wrapper")) as ERC20Wrapper__factory;
  const confidentialERC20Wrapper = (await ConfidentialERC20WrapperFactory.deploy(
    mockERC20_address,
    "USDCc",
    "USDCc",
    ""
  )) as ERC20Wrapper;
  const confidentialERC20Wrapper_address = await confidentialERC20Wrapper.getAddress();

  return { 
    mockERC20,
    mockERC20_address,
    confidentialERC20Wrapper, 
    confidentialERC20Wrapper_address 
  };
}
