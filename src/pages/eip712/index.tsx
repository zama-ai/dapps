import React, { useState, useEffect } from 'react';
import { HeadFC, PageProps } from 'gatsby';
import { ContractAddress } from '../../components/ContractAddress';
import { Connect } from '../../components/Connect';
import { EIP712 } from '../../components/EIP712';
import abi from '../../abi/eip712Abi.json';

import '../default.css';
import { withTheme } from '../../withTheme';

const IndexPage: React.FC<PageProps> = withTheme(() => {
  const [contractAddress, setContractAddress] = useState('');

  useEffect(() => {
    const storedInputAddress = localStorage.getItem('eip712');
    if (storedInputAddress) {
      setContractAddress(storedInputAddress);
    }
  }, []);

  return (
    <main className="Main">
      <Connect key={contractAddress} back title="EIP712 Test">
        {(account, provider) => (
          <>
            <ContractAddress title="EIP712 Address" onConfirm={setContractAddress} storageKey="eip712" />
            <EIP712 account={account} provider={provider} contractAddress={contractAddress} abi={abi} />
          </>
        )}
      </Connect>
    </main>
  );
});

export default IndexPage;

export const Head: HeadFC = () => <title>Zama ERC20</title>;
