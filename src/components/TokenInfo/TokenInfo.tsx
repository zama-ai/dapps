import React, { useEffect, useState } from 'react';
import { Contract } from 'ethers';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  ListItemText,
} from '@mui/material';
import { Loader } from '../Loader';
import { getInstance, getTokenSignature } from '../../wallet';

const NO_SUPPLY = 'NO_SUPPLY';

export const TokenInfo: React.FC<{
  abi: any;
  account: string;
  contract: Contract;
  provider: any;
}> = ({ abi, account, contract, provider }) => {
  const [name, setName] = useState('');
  const [decimals, setDecimals] = useState('');
  const [symbol, setSymbol] = useState('');
  const [totalSupply, setTotalSupply] = useState<number | null>(null);
  const [loading, setLoading] = useState<string>('');
  const [dialog, setDialog] = useState('');

  useEffect(() => {
    try {
      contract.name().then(setName);
      contract.decimals().then(setDecimals);
      contract.symbol().then(setSymbol);
    } catch (e) {
      console.log(e);
    }
  }, []);

  const mint = async () => {
    try {
      setLoading('Encrypting "30" and generating ZK proof...');
      const encrypted = getInstance().encrypt32(30);
      console.log('wtf');
      setLoading('Sending transaction...');
      const transaction = await contract.mint(encrypted);
      setLoading('Waiting for transaction validation...');
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      setDialog('The contract has been minted!');
    } catch (e) {
      console.log(e);
      setLoading('');
    }
  };

  const reencrypt = async () => {
    try {
      const contractAddress = await contract.getAddress();
      setLoading('Decrypting total supply...');
      const { publicKey, signature } = await getTokenSignature(contractAddress, account);
      const ciphertext: string = await contract.getTotalSupply(publicKey, signature);
      console.log(ciphertext);
      const totalSup = await getInstance().decrypt(contractAddress, ciphertext);
      setTotalSupply(totalSup);
      setLoading('');
    } catch (e) {
      setLoading('');
      console.log(e);
    }
  };

  const handleClose = () => setDialog('');

  return (
    <>
      <Card>
        <CardHeader title={name} />
        <CardContent>
          <ListItemText primary={`Symbol ${symbol}`} secondary={`Decimals ${decimals}`} />
          {!totalSupply && <ListItemText primary="Total supply" secondary="" />}
          {totalSupply && <ListItemText primary="Total supply" secondary={`${totalSupply} ${symbol}`} />}
        </CardContent>
        <CardActions>
          {!loading && <Button onClick={mint}>Mint 30 tokens</Button>}
          {!loading && <Button onClick={reencrypt}>Total supply</Button>}
          <Loader message={loading} />
        </CardActions>
      </Card>
      <Dialog
        open={dialog !== ''}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>{dialog}</DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>OK</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
