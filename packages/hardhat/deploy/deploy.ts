import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHECounter = await deploy("FHECounter", {
    from: deployer,
    log: true,
  });

  const deployedERC7984 = await deploy("ERC7984Example", {
    from: deployer,
    log: true,
    args: [1000000],
  });

  console.log(`FHECounter contract: `, deployedFHECounter.address);
  console.log(`ERC7984Example contract: `, deployedERC7984.address);
};
export default func;
func.id = "deploy_fheCounter_and_erc7984"; // id required to prevent reexecution
func.tags = ["FHECounter", "ERC7984Example"];
