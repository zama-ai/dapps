import React, { useMemo } from 'react';
import { Contract, ethers } from 'ethers';
import { Line } from '../Line';
import { TokenInfo } from '../TokenInfo';
import { TokenBalance } from '../TokenBalance';

import './Token.css';
import { TokenTransfer } from '../TokenTransfer';

export const Token: React.FC<{
  account: string;
  provider: ethers.providers.Web3Provider;
  contractAddress: string;
  abi: any;
}> = ({ account, provider, contractAddress, abi }) => {
  const contract = useMemo<Contract | null>(() => {
    if (
      !contractAddress ||
      !abi ||
      !provider ||
      !ethers.utils.isAddress(contractAddress)
    ) {
      return null;
    }

    try {
      return new ethers.Contract(contractAddress, abi, provider.getSigner());
    } catch (e) {
      return null;
    }
  }, [abi, contractAddress, provider]);

  if (!contract) {
    return null;
  }

  return (
    <div className="Token">
      <Line>
        <TokenInfo
          abi={abi}
          account={account}
          contract={contract}
          provider={provider}
        />
        <TokenBalance
          account={account}
          contract={contract}
          provider={provider}
          abi={abi}
        />
      </Line>
      <Line>
        <TokenTransfer contract={contract} provider={provider} />
      </Line>
    </div>
  );
};
