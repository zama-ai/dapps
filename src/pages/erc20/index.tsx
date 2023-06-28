import React, { useState, useEffect } from 'react';
import { HeadFC, PageProps } from 'gatsby';
import { ContractFactory } from 'ethers';
import { Contract } from '../../components/Contract';
import { Connect } from '../../components/Connect';
import { Token } from '../../components/Token';
import { withTheme } from '../../withTheme';
import encryptedERC20 from '../../contracts/EncryptedERC20.json';

import '../default.css';

const IndexPage: React.FC<PageProps> = withTheme(() => {
  return (
    <main className="Main">
      <Connect back title="ERC20 Explorer">
        {(account, provider) => {
          const deployErc20 = async () => {
            const contractFactory = new ContractFactory(
              encryptedERC20.abi,
              encryptedERC20.bytecode,
              await provider.getSigner()
            );
            const c = await contractFactory.deploy();
            await c.waitForDeployment();
            return c.getAddress();
          };
          return (
            <Contract title="ERC20 Contract" storageKey="erc20" onDeploy={deployErc20}>
              {(contractAddress) => (
                <Token
                  key={contractAddress}
                  account={account}
                  provider={provider}
                  contractAddress={contractAddress}
                  abi={encryptedERC20.abi}
                />
              )}
            </Contract>
          );
        }}
      </Connect>
    </main>
  );
});

export default IndexPage;

export const Head: HeadFC = () => <title>Zama ERC20</title>;
