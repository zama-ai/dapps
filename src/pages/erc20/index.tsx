import React, { useState, useEffect } from 'react';
import type { HeadFC, PageProps } from 'gatsby';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { ContractAddress } from '../../components/ContractAddress';
import { Connect } from '../../components/Connect';
import { Token } from '../../components/Token';
import abi from '../../abi/erc20Abi.json';

import '../default.css';

const IndexPage: React.FC<PageProps> = () => {
  const [contractAddress, setContractAddress] = useState('');

  useEffect(() => {
    const storedInputAddress = localStorage.getItem('erc20');
    if (storedInputAddress) {
      setContractAddress(storedInputAddress);
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <main className="Main">
        <Connect key={contractAddress} back title="ERC20 Explorer">
          {(account, provider) => (
            <>
              <ContractAddress
                title="Token Address"
                onConfirm={setContractAddress}
                storageKey="erc20"
              />
              <Token
                account={account}
                provider={provider}
                contractAddress={contractAddress}
                abi={abi}
              />
            </>
          )}
        </Connect>
      </main>
    </ThemeProvider>
  );
};

export default IndexPage;

export const Head: HeadFC = () => <title>Zama ERC20</title>;
