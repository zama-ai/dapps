import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Deploy MyConfidentialERC20
  const deployedERC20 = await deploy("MyConfidentialERC20", {
    from: deployer,
    args: ["Naraggara", "NARA"],
    log: true,
  });
  console.log(`MyConfidentialERC20 contract: `, deployedERC20.address);

  // Deploy EncryptedCounter4
  const deployedCounter = await deploy("EncryptedCounter4", {
    from: deployer,
    args: [], // No constructor arguments needed
    log: true,
  });
  console.log(`EncryptedCounter4 contract: `, deployedCounter.address);
};

export default func;
func.id = "deploy_confidentialERC20"; // id required to prevent reexecution
func.tags = ["MyConfidentialERC20"];
