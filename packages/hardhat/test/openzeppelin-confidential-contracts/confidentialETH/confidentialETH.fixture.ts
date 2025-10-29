import { FhevmType } from "@fhevm/hardhat-plugin";
import { ethers } from "hardhat";
import * as hre from "hardhat";

import type { ETHWrapper, IERC20 } from "../../types";
import type { ETHWrapper__factory } from "../../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Signer } from "ethers";

export async function deployConfidentialETHWrapperFixture() {
  // Contracts are deployed using the first signer/account by default
  const ConfidentialETHWrapperFactory = (await ethers.getContractFactory("ETHWrapper")) as ETHWrapper__factory;
  const confidentialETHWrapper = (await ConfidentialETHWrapperFactory.deploy()) as ETHWrapper;
  const confidentialETHWrapper_address = await confidentialETHWrapper.getAddress();

  return { confidentialETHWrapper, confidentialETHWrapper_address };
}

export async function reencryptAllowance(
  account: Signer,
  spender: Signer,
  token: IERC20,
  tokenAddress: string,
): Promise<bigint> {
  const encryptedAllowance = await token.allowance(account, spender);
  const allowance = await hre.fhevm.userDecryptEuint(
    FhevmType.euint64,
    encryptedAllowance.toString(),
    tokenAddress,
    account,
  );
  return allowance;
}

export async function reencryptBalance(
  account: HardhatEthersSigner,
  token: any,
  tokenAddress: string,
): Promise<bigint> {
  const encryptedBalance = await token.confidentialBalanceOf(account.address);
  const balance = await hre.fhevm.userDecryptEuint(
    FhevmType.euint64,
    encryptedBalance.toString(),
    tokenAddress,
    account,
  );
  return balance;
}
