import React, { useState, useEffect } from 'react';
import { HeadFC, PageProps } from 'gatsby';
import { ContractFactory } from 'ethers';
import { Contract } from '../../components/Contract';
import { Connect } from '../../components/Connect';
import { EIP712 } from '../../components/EIP712';

import { withTheme } from '../../withTheme';
import eip712 from '../../contracts/AuthorizationToken.json';

import '../default.css';

const IndexPage: React.FC<PageProps> = withTheme(() => {
  return (
    <main className="Main">
      <Connect back title="EIP-712">
        {(account, provider) => {
          const deployEip712 = async () => {
            const contractFactory = new ContractFactory(eip712.abi, eip712.bytecode, await provider.getSigner());
            const c = await contractFactory.deploy();
            await c.waitForDeployment();
            console.log(await c.getAddress());
            return c.getAddress();
          };
          return (
            <Contract title="EIP-712 Contract" storageKey="eip712" onDeploy={deployEip712}>
              {(contractAddress: string) => (
                <EIP712 account={account} provider={provider} contractAddress={contractAddress} abi={eip712.abi} />
              )}
            </Contract>
          );
        }}
      </Connect>
    </main>
  );
});

export default IndexPage;

export const Head: HeadFC = () => <title>Zama ERC-20</title>;
