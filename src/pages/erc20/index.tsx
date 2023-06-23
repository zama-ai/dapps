import React, { useState, useEffect } from 'react';
import { HeadFC, PageProps } from 'gatsby';
import { ContractAddress } from '../../components/ContractAddress';
import { Connect } from '../../components/Connect';
import { Token } from '../../components/Token';
import abi from '../../abi/erc20Abi.json';

import '../default.css';
import { withTheme } from '../../withTheme';

const IndexPage: React.FC<PageProps> = withTheme(() => {
  const [contractAddress, setContractAddress] = useState('');

  useEffect(() => {
    const storedInputAddress = localStorage.getItem('erc20');
    if (storedInputAddress) {
      setContractAddress(storedInputAddress);
    }
  }, []);

  return (
    <main className="Main">
      <Connect key={contractAddress} back title="ERC20 Explorer">
        {(account, provider) => (
          <>
            <ContractAddress title="Token Address" onConfirm={setContractAddress} storageKey="erc20" />
            <Token account={account} provider={provider} contractAddress={contractAddress} abi={abi} />
          </>
        )}
      </Connect>
    </main>
  );
});

export default IndexPage;

export const Head: HeadFC = () => <title>Zama ERC20</title>;
