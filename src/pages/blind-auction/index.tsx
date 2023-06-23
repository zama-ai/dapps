import React, { useState, useEffect } from 'react';
import { HeadFC, PageProps } from 'gatsby';
import { ContractAddress } from '../../components/ContractAddress';
import { Connect } from '../../components/Connect';
import { Auctions } from '../../components/Auctions';
import { withTheme } from '../../withTheme';

import abi from '../../abi/blindAuctionAbi.json';
import erc20Abi from '../../abi/erc20Abi.json';

import '../default.css';

const IndexPage: React.FC<PageProps> = withTheme(() => {
  const [contractAddress, setContractAddress] = useState('');

  useEffect(() => {
    const storedInputAddress = localStorage.getItem('blindAuction');
    if (storedInputAddress) {
      setContractAddress(storedInputAddress);
    }
  }, []);

  return (
    <main className="Main">
      <Connect key={contractAddress} back title="Blind auction">
        {(account, provider) => (
          <>
            <ContractAddress title="Blind auction address" onConfirm={setContractAddress} storageKey="blindAuction" />
            <Auctions
              provider={provider}
              account={account}
              abi={abi}
              erc20Abi={erc20Abi}
              contractAddress={contractAddress}
            />
          </>
        )}
      </Connect>
    </main>
  );
});

export default IndexPage;

export const Head: HeadFC = () => <title>Zama Blind Auction</title>;
