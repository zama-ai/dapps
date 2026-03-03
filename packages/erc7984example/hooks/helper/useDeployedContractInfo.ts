import { useEffect, useState } from "react";
import { useIsMounted } from "usehooks-ts";
import { usePublicClient } from "wagmi";
import { useSelectedNetwork } from "~~/hooks/helper";
import {
  Contract,
  ContractCodeStatus,
  ContractName,
  UseDeployedContractConfig,
  contracts,
} from "~~/utils/helper/contract";

export function useDeployedContractInfo<TContractName extends ContractName>(
  config: UseDeployedContractConfig<TContractName>,
) {
  const isMounted = useIsMounted();
  const { contractName, chainId } = config;
  const selectedNetwork = useSelectedNetwork(chainId);
  const deployedContract = contracts?.[selectedNetwork.id]?.[contractName as ContractName] as Contract<TContractName>;
  const [status, setStatus] = useState<ContractCodeStatus>(ContractCodeStatus.LOADING);
  const publicClient = usePublicClient({ chainId: selectedNetwork.id });

  useEffect(() => {
    const checkContractDeployment = async () => {
      try {
        if (!isMounted() || !publicClient) return;

        if (!deployedContract) {
          setStatus(ContractCodeStatus.NOT_FOUND);
          return;
        }

        const code = await publicClient.getBytecode({ address: deployedContract.address });
        setStatus(code === "0x" ? ContractCodeStatus.NOT_FOUND : ContractCodeStatus.DEPLOYED);
      } catch (e) {
        console.error(e);
        setStatus(ContractCodeStatus.NOT_FOUND);
      }
    };

    checkContractDeployment();
  }, [isMounted, contractName, deployedContract, publicClient]);

  return {
    data: status === ContractCodeStatus.DEPLOYED ? deployedContract : undefined,
    isLoading: status === ContractCodeStatus.LOADING,
  };
}
