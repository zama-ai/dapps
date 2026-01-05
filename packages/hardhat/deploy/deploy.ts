import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedERC7984 = await deploy("ERC7984Example", {
    from: deployer,
    log: true,
    args: [
      1000000, // Initial amount (uint64)
      "Confidential Token", // Token name
      "CTKN", // Token symbol
      "https://example.com/token", // Token URI
    ],
  });

  console.log(`ERC7984Example contract: `, deployedERC7984.address);

  const deployedAirdrop = await deploy("Airdrop", {
    from: deployer,
    log: true,
  });

  console.log(`Airdrop contract: `, deployedAirdrop.address);
};
export default func;
func.id = "deploy_erc7984"; // id required to prevent reexecution
func.tags = ["ERC7984Example", "Airdrop"];
