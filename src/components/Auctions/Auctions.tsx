import React, { useEffect, useState } from 'react';
import { BigNumber, Contract, ethers } from 'ethers';

import './Auctions.css';
import { Line } from '../Line';
import { Auction } from '../Auction/Auction';
import { Bid } from '../Bid';

export const Auctions: React.FC<{
  account: string;
  provider: ethers.providers.Web3Provider;
  contractAddress: string;
  abi: any;
  erc20Abi: any;
}> = ({ account, provider, contractAddress, abi, erc20Abi }) => {
  const [claimed, setClaimed] = useState(false);
  const [manuallyStopped, setManuallyStopped] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [endTime, setEndTime] = useState<BigNumber | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [erc20Contract, setErc20Contract] = useState<Contract | null>(null);

  useEffect(() => {
    if (
      (endTime && Date.now() >= endTime.toNumber() * 1000) ||
      manuallyStopped
    ) {
      setStopped(true);
    }
  }, [endTime, manuallyStopped]);

  useEffect(() => {
    if (
      !contractAddress ||
      !abi ||
      !provider ||
      !ethers.utils.isAddress(contractAddress)
    ) {
      return;
    }

    const c = new ethers.Contract(contractAddress, abi, provider.getSigner());

    c.objectClaimed().then(setClaimed);
    c.endTime().then(setEndTime);
    c.manuallyStopped().then(setManuallyStopped);

    setContract(c);

    c.tokenContract().then((tokenContract: string) => {
      const erc20C = new ethers.Contract(
        tokenContract,
        erc20Abi,
        provider.getSigner(),
      );
      setErc20Contract(erc20C);
    });
  }, [abi, contractAddress, provider]);

  if (!contract || !erc20Contract) {
    return null;
  }

  return (
    <div className="Auctions">
      <Line>
        <Auction
          claimed={claimed}
          stopped={stopped}
          endTime={endTime}
          contract={contract}
          erc20Contract={erc20Contract}
        />
        <Bid
          claimed={claimed}
          stopped={stopped}
          account={account}
          contract={contract}
          erc20Contract={erc20Contract}
          abi={abi}
          onClaim={() => setClaimed(true)}
        />
      </Line>
    </div>
  );
};
