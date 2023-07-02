import React, { useEffect, useState } from 'react';
import { BrowserProvider, Contract, isAddress } from 'ethers';

import { Line } from '../../../../components/Line';
import { BetInfo } from '../BetInfo';
import { BetAction } from '../BetAction';
import { PrivateBetGame } from '../PrivateBetGame';

export const PrivateBet: React.FC<{
  account: string;
  provider: BrowserProvider;
  contractAddress: string;
  abi: any;
  erc20Abi: any;
}> = ({ account, provider, contractAddress, abi, erc20Abi }) => {
  const [contract, setContract] = useState<Contract | null>(null);
  const [erc20Contract, setErc20Contract] = useState<Contract | null>(null);

  useEffect(() => {
    if (!contractAddress || !abi || !provider || !isAddress(contractAddress)) {
      return;
    }

    provider.getSigner().then((signer) => {
      const c = new Contract(contractAddress, abi, signer);

      setContract(c);

      c.tokenContract().then((tokenContract: string) => {
        const erc20C = new Contract(tokenContract, erc20Abi, signer);
        setErc20Contract(erc20C);
      });
    });
  }, [abi, contractAddress, provider]);

  if (!contract || !erc20Contract) {
    return null;
  }

  return (
    <div className="Auctions">
      <PrivateBetGame account={account} erc20Contract={erc20Contract} contract={contract} provider={provider}>
        {(game, gameId, isAdmin) => (
          <Line key={gameId}>
            <BetInfo
              isAdmin={isAdmin}
              game={game}
              gameId={gameId}
              contract={contract}
              provider={provider}
              erc20Contract={erc20Contract}
            />
            <BetAction
              game={game}
              gameId={gameId}
              account={account}
              contract={contract}
              provider={provider}
              erc20Contract={erc20Contract}
              abi={abi}
            />
          </Line>
        )}
      </PrivateBetGame>
    </div>
  );
};
