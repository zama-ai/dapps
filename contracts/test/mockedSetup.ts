import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  ACL_ADDRESS,
  FHEPAYMENT_ADDRESS,
  GATEWAYCONTRACT_ADDRESS,
  INPUTVERIFIER_ADDRESS,
  KMSVERIFIER_ADDRESS,
  PRIVATE_KEY_KMS_SIGNER,
  TFHEEXECUTOR_ADDRESS,
} from "./constants";

const nullAddress = "0x0000000000000000000000000000000000000000";
const oneAddress = "0x0000000000000000000000000000000000000001";

export async function setCodeMocked(hre: any): Promise<void> {
  const aclArtifact = await import("../node_modules/fhevm-core-contracts/artifacts/contracts/ACL.sol/ACL.json");
  const aclBytecode = aclArtifact.default.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [ACL_ADDRESS, aclBytecode]);
  const execArtifact = await import(
    "../node_modules/fhevm-core-contracts/artifacts/contracts/TFHEExecutorWithEvents.sol/TFHEExecutorWithEvents.json"
  );
  const execBytecode = execArtifact.default.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [TFHEEXECUTOR_ADDRESS, execBytecode]);
  const kmsArtifact = await import(
    "../node_modules/fhevm-core-contracts/artifacts/contracts/KMSVerifier.sol/KMSVerifier.json"
  );
  const kmsBytecode = kmsArtifact.default.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [KMSVERIFIER_ADDRESS, kmsBytecode]);
  const inputArtifact = await import(
    "../node_modules/fhevm-core-contracts/artifacts/contracts/InputVerifier.coprocessor.sol/InputVerifier.json"
  );
  const inputBytecode = inputArtifact.default.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [INPUTVERIFIER_ADDRESS, inputBytecode]);
  const fhepaymentArtifact = await import(
    "../node_modules/fhevm-core-contracts/artifacts/contracts/FHEPayment.sol/FHEPayment.json"
  );
  const fhepaymentBytecode = fhepaymentArtifact.default.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [FHEPAYMENT_ADDRESS, fhepaymentBytecode]);
  const gatewayArtifact = await import(
    "../node_modules/fhevm-core-contracts/artifacts/gateway/GatewayContract.sol/GatewayContract.json"
  );
  const gatewayBytecode = gatewayArtifact.default.deployedBytecode;
  await hre.network.provider.send("hardhat_setCode", [GATEWAYCONTRACT_ADDRESS, gatewayBytecode]);
  const zero = await impersonateNullAddress(hre);
  const one = await impersonateOneAddress(hre);
  const kmsSigner = new hre.ethers.Wallet(PRIVATE_KEY_KMS_SIGNER);
  const kms = await hre.ethers.getContractAt(kmsArtifact.abi, KMSVERIFIER_ADDRESS);
  await kms.connect(zero).initialize(oneAddress);
  await kms.connect(one).addSigner(kmsSigner);
  const input = await hre.ethers.getContractAt(inputArtifact.abi, INPUTVERIFIER_ADDRESS);
  await input.connect(zero).initialize(oneAddress);
  const gateway = await hre.ethers.getContractAt(gatewayArtifact.abi, GATEWAYCONTRACT_ADDRESS);
  await gateway.connect(zero).addRelayer(nullAddress);
}

let initNull = false;
async function impersonateNullAddress(hre: HardhatRuntimeEnvironment) {
  // for mocked mode
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [nullAddress],
  });
  if (!initNull) {
    await hre.network.provider.send("hardhat_setBalance", [
      nullAddress,
      "0x56BC75E2D63100000", // 100 ETH in hex
    ]);
    initNull = true;
  }
  const nullSigner = await hre.ethers.getSigner(nullAddress);
  return nullSigner;
}

let initOne = false;
async function impersonateOneAddress(hre: HardhatRuntimeEnvironment) {
  // for mocked mode
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [oneAddress],
  });
  if (!initOne) {
    await hre.network.provider.send("hardhat_setBalance", [
      oneAddress,
      "0x56BC75E2D63100000", // 100 ETH in hex
    ]);
    initOne = true;
  }
  const oneSigner = await hre.ethers.getSigner(oneAddress);
  return oneSigner;
}
