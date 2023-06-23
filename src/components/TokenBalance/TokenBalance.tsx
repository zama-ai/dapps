import React, { useEffect, useState } from 'react';
import { Contract } from 'ethers';
import { Button, Card, CardActions, CardContent, CardHeader, ListItemText } from '@mui/material';
import { Loader } from '../Loader';
import { getInstance, getTokenSignature } from '../../wallet';

export const TokenBalance: React.FC<{
  abi: any;
  account: string;
  contract: Contract;
  provider: any;
}> = ({ abi, account, contract, provider }) => {
  const [decryptedBalance, setDecryptedBalance] = useState<number | null>(null);
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState('');

  useEffect(() => {
    try {
      setDecryptedBalance(null);
    } catch (e) {
      console.log(e);
    }
  }, [account]);

  useEffect(() => {
    try {
      contract.symbol().then(setSymbol);
    } catch (e) {
      console.log(e);
    }
  }, [contract]);

  const reencrypt = async () => {
    try {
      const contractAddress = await contract.getAddress();
      setLoading('Decrypting your balance...');
      const { publicKey, signature } = await getTokenSignature(contractAddress, account);
      const ciphertext = await contract.balanceOf(publicKey, signature);
      const balance = await getInstance().decrypt(contractAddress, ciphertext);
      setDecryptedBalance(balance);
      setLoading('');
    } catch (e) {
      setLoading('');
      console.log(e);
    }
  };

  return (
    <Card>
      <CardHeader title="Your balance" />
      <CardContent>
        {decryptedBalance && <ListItemText primary={`${decryptedBalance} ${symbol}`} />}
        {!decryptedBalance && `- ${symbol}`}
      </CardContent>

      <CardActions>
        {!loading && <Button onClick={reencrypt}>{decryptedBalance ? 'Refresh' : 'Get balance'}</Button>}
        <Loader message={loading} />
      </CardActions>
    </Card>
  );
};
