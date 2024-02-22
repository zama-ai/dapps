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
const toHexString = (bytes: Uint8Array) => {
  return Array.from(bytes, (byte) => {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
};
export const TokenInfo: React.FC<{
  abi: any;
  account: string;
  contract: Contract;
  provider: any;
}> = ({ abi, account, contract, provider }) => {
  const [name, setName] = useState('');
  const [decimals, setDecimals] = useState('');
  const [symbol, setSymbol] = useState('');
  const [totalSupply, setTotalSupply] = useState<string>('');
  const [loading, setLoading] = useState<string>('');
  const [dialog, setDialog] = useState('');

  useEffect(() => {
    try {
      contract.name().then(setName);
      contract.decimals().then(setDecimals);
      contract.symbol().then(setSymbol);
      refreshTotalSupply();
    } catch (e) {
      console.log(e);
    }
  }, []);

  const mint = async () => {
    try {
      setLoading('Sending transaction...');
      const transaction = await contract.mint(1000);
      setLoading('Waiting for transaction validation...');
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      setDialog('The contract has been minted!');
    } catch (e) {
      console.log(e);
      setLoading('');
      setDialog('Transaction error!');
    }
  };

  const refreshTotalSupply = async () => {
    try {
      const ts = await contract.totalSupply();
      setTotalSupply(ts.toString());
    } catch (e) {
      setDialog('Error during getting total supply!');
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
          {!loading && <Button onClick={mint}>Mint 1000 tokens</Button>}
          {!loading && <Button onClick={refreshTotalSupply}>Total supply</Button>}
          <Loader message={loading} />
        </CardActions>
      </Card>
      <Dialog
        open={dialog !== ''}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        id="mint_dialog"
      >
        <DialogContent>{dialog}</DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>OK</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
