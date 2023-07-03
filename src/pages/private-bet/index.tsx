import React from 'react';
import { HeadFC, PageProps } from 'gatsby';
import { ContractFactory, isAddress } from 'ethers';
import queryString from 'query-string';
import { Contract } from '../../components/Contract';
import { Connect } from '../../components/Connect';
import { PrivateBet } from '../../modules/private-bet';
import { withTheme } from '../../withTheme';

import privateBet from '../../contracts/PrivateBet.json';
import encryptedERC20 from '../../contracts/EncryptedERC20.json';

import '../default.css';

const IndexPage: React.FC<PageProps> = withTheme(() => {
  if (location.search) {
    const params = queryString.parse(location.search);
    if (params.contract) {
      if (isAddress(params.contract)) {
        localStorage.setItem('privateBet', params.contract);
      }
      if (typeof window !== 'undefined') {
        (window.location as any) = location.pathname;
      }
    }
  }
  return (
    <main className="Main">
      <Connect back title="Double or nothing">
        {(account, provider) => {
          const deployPrivateBetting = async () => {
            const erc20Factory = new ContractFactory(
              encryptedERC20.abi,
              encryptedERC20.bytecode,
              await provider.getSigner()
            );
            const c1 = await erc20Factory.deploy();
            await c1.waitForDeployment();
            const erc20Address = await c1.getAddress();
            const baFactory = new ContractFactory(privateBet.abi, privateBet.bytecode, await provider.getSigner());
            const c2 = await baFactory.deploy(erc20Address);
            await c2.waitForDeployment();
            return c2.getAddress();
          };
          return (
            <Contract title="Private Bet Contract" storageKey="privateBet" onDeploy={deployPrivateBetting}>
              {(contractAddress) => (
                <PrivateBet
                  key={contractAddress}
                  provider={provider}
                  account={account}
                  abi={privateBet.abi}
                  erc20Abi={encryptedERC20.abi}
                  contractAddress={contractAddress}
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

export const Head: HeadFC = () => <title>Zama Private Bet</title>;
