import React, { useEffect, useMemo, useState } from 'react';
import { Contract, ethers, BrowserProvider, isAddress } from 'ethers';
import { Line } from '../Line';
import { TokenInfo } from '../TokenInfo';
import { TokenBalance } from '../TokenBalance';

import './Token.css';
import { TokenTransfer } from '../TokenTransfer';

export const Token: React.FC<{
  account: string;
  provider: BrowserProvider;
  contractAddress: string;
  abi: any;
}> = ({ account, provider, contractAddress, abi }) => {
  const [contract, setContract] = useState<Contract>();
  useEffect(() => {
    if (!contractAddress || !abi || !provider || !isAddress(contractAddress)) {
      return;
    }
    provider.getSigner().then((signer) => {
      const c = new Contract(contractAddress, abi, signer);
      setContract(c);
    });
  }, [abi, contractAddress, provider]);

  if (!contract) {
    return null;
  }

  return (
    <div className="Token">
      <Line>
        <TokenInfo abi={abi} account={account} contract={contract} provider={provider} />
        <TokenBalance account={account} contract={contract} provider={provider} abi={abi} />
      </Line>
      <Line>
        <TokenTransfer contract={contract} provider={provider} />
      </Line>
    </div>
  );
};
