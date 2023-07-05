import React, { useState, useEffect } from 'react';
import { HeadFC, PageProps } from 'gatsby';
import { Contract } from '../../components/Contract';
import { Connect } from '../../components/Connect';
import { Auctions } from '../../components/Auctions';
import { withTheme } from '../../withTheme';

import blindAuction from '../../contracts/BlindAuction.json';
import encryptedERC20 from '../../contracts/EncryptedERC20.json';

import '../default.css';
import { ContractFactory } from 'ethers';

const IndexPage: React.FC<PageProps> = withTheme(() => {
  return (
    <main className="Main">
      <Connect back title="Blind auction">
        {(account, provider) => {
          const deployBlindAuction = async () => {
            const erc20Factory = new ContractFactory(
              encryptedERC20.abi,
              encryptedERC20.bytecode,
              await provider.getSigner()
            );
            const c1 = await erc20Factory.deploy();
            await c1.waitForDeployment();
            const erc20Address = await c1.getAddress();

            const baFactory = new ContractFactory(blindAuction.abi, blindAuction.bytecode, await provider.getSigner());
            const c2 = await baFactory.deploy(account, erc20Address, 600, true);
            await c2.waitForDeployment();
            return c2.getAddress();
          };
          return (
            <Contract title="Blind Auction Contract" storageKey="blindAuction" onDeploy={deployBlindAuction}>
              {(contractAddress) => (
                <Auctions
                  key={contractAddress}
                  provider={provider}
                  account={account}
                  abi={blindAuction.abi}
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

export const Head: HeadFC = () => <title>Zama Blind Auction</title>;
