import React, { useState, useEffect } from 'react';
import { HeadFC, PageProps, Script } from 'gatsby';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { ContractAddress } from '../../components/ContractAddress';
import { Connect } from '../../components/Connect';
import { EIP712 } from '../../components/EIP712';
import abi from '../../abi/eip712Abi.json';

import '../default.css';

const IndexPage: React.FC<PageProps> = () => {
  const [contractAddress, setContractAddress] = useState('');

  useEffect(() => {
    const storedInputAddress = localStorage.getItem('eip712');
    if (storedInputAddress) {
      setContractAddress(storedInputAddress);
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Script src="/static/zamaweb3.min.js" />
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
    </ThemeProvider>
  );
};

export default IndexPage;

export const Head: HeadFC = () => <title>Zama ERC20</title>;
