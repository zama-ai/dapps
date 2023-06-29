import React, { ChangeEventHandler, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@mui/material';
import { isAddress } from 'ethers';
import { ContractAddress } from '../ContractAddress';
import { ContractDeploy } from '../ContractDeploy';

import './Contract.css';
import { Line } from '../Line';

export const Contract: React.FC<{
  onDeploy?: () => Promise<string>;
  title: string;
  storageKey: string;
  children: (contractAddress: string) => JSX.Element;
}> = ({ onDeploy, title, storageKey, children }) => {
  const [inputAddress, setInputAddress] = React.useState<string>('');
  const [currentAddress, setCurrentAddress] = React.useState<string>('');

  useEffect(() => {
    const storedInputAddress = localStorage.getItem(storageKey);
    if (storedInputAddress) {
      setInputAddress(storedInputAddress);
      setCurrentAddress(storedInputAddress);
    }
  }, []);

  const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setInputAddress(e.target.value);
  };

  const handleConfirm = () => {
    if (!inputAddress || isAddress(inputAddress)) {
      localStorage.setItem(storageKey, inputAddress);
      setCurrentAddress(inputAddress);
    }
  };

  const handleDeploy = async () => {
    if (!onDeploy) return;
    const address = await onDeploy();
    console.log(`Contract ${address} deployed`);
    setCurrentAddress(address);
    localStorage.setItem(storageKey, address);
    setInputAddress(address);
  };

  return (
    <>
      <Line>
        <Card className="Contract">
          <CardHeader title={title} subheader="Define your contract address" />
          <CardContent className="Contract__content">
            <ContractAddress value={inputAddress} onChange={onChange} onConfirm={handleConfirm} />
          </CardContent>
        </Card>
        {onDeploy && (
          <Card className="Contract">
            <CardHeader title="Deploy a contract" />
            <CardContent className="Contract__content">
              <ContractDeploy onDeploy={handleDeploy} title={title} />
            </CardContent>
          </Card>
        )}
      </Line>
      {currentAddress && children(currentAddress)}
    </>
  );
};
