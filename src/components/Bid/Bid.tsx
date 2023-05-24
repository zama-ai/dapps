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
import { encrypt, callAndDecrypt } from '../../wallet';

export const Bid: React.FC<{
  abi: any;
  account: string;
  claimed: boolean;
  contract: Contract;
  erc20Contract: Contract;
  stopped: boolean;
  onClaim: () => void;
}> = ({ abi, account, claimed, contract, erc20Contract, stopped, onClaim }) => {
  const [currentBid, setCurrentBid] = useState('');
  const [symbol, setSymbol] = useState('');
  const [highestBid, setHighestBid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<string>('');
  const [dialog, setDialog] = useState('');

  useEffect(() => {
    erc20Contract.symbol().then(setSymbol);
  }, []);

  const getCurrentBid = async () => {
    try {
      const bid: string = await callAndDecrypt(contract.provider, {
        account,
        abi,
        address: contract.address,
        method: 'getBid',
      });
      setCurrentBid(bid);
    } catch (e) {
      console.log(e);
    }
  };

  const bid = async (value: number) => {
    try {
      if (stopped) {
        return;
      }
      setLoading(`Encrypting "${value}" and generating ZK proof...`);
      const encryptedErc20Value = await encrypt(erc20Contract.provider, value);
      setLoading('Sending ERC20 approve transaction');
      const erc20Transaction = await erc20Contract.approve(
        contract.address,
        encryptedErc20Value,
      );
      setLoading('Waiting for ERC20 approve transaction validation...');
      await erc20Contract.provider.waitForTransaction(erc20Transaction.hash);

      setLoading(`Encrypting "${value}" and generating ZK proof...`);
      const encryptedValue = await encrypt(contract.provider, value);
      setLoading('Sending bid transaction...');

      const transaction = await contract.bid(encryptedValue);
      setLoading('Waiting for bid transaction validation...');
      await contract.provider.waitForTransaction(transaction.hash);
      setLoading('');
      setDialog(`You bid ${value} token${value > 1 ? 's' : ''}!`);
    } catch (e) {
      console.log(e);
      setLoading('');
    }
  };

  const doIHaveHighestBid = async () => {
    try {
      if (!stopped) {
        return;
      }
      setLoading('Decrypting do I have highest bid...');
      const hb: string = await callAndDecrypt(contract.provider, {
        account,
        abi,
        address: contract.address,
        method: 'doIHaveHighestBid',
      });
      setHighestBid(Boolean(parseInt(hb, 2)));
      setLoading('');
    } catch (e) {
      setLoading('');
      console.log(e);
    }
  };

  const claim = async () => {
    try {
      if (!stopped) {
        return;
      }
      setLoading('Sending transaction...');
      const transaction = await contract.claim();
      setLoading('Waiting for transaction validation...');
      await contract.provider.waitForTransaction(transaction.hash);
      setLoading('');
      setDialog('You claimed successfully!');
      onClaim();
    } catch (e) {
      setLoading('');
    }
  };

  const withdraw = async () => {
    try {
      if (!stopped) {
        return;
      }
      setLoading('Sending transaction...');
      const transaction = await contract.withdraw();
      setLoading('Waiting for transaction validation...');
      await contract.provider.waitForTransaction(transaction.hash);
      setLoading('');
      setDialog('You withdrawed successfully!');
    } catch (e) {
      setLoading('');
    }
  };

  const handleClose = () => setDialog('');

  const yesno = (b: boolean | null) => {
    if (b === null) {
      return '-';
    }
    return b ? 'Yes' : 'No';
  };

  return (
    <>
      <Card>
        <CardHeader title="My Bid" />
        <CardContent>
          {stopped && (
            <ListItemText primary="Highest bid" secondary={yesno(highestBid)} />
          )}
          {
            <ListItemText
              primary="Your current bid"
              secondary={currentBid === '' ? 'None' : `${currentBid} ${symbol}`}
            />
          }
        </CardContent>
        <CardActions>
          {!loading && (
            <Button onClick={getCurrentBid}>Get my current bid</Button>
          )}
          {!stopped && !loading && (
            <Button onClick={() => bid(1)}>Bid 1 token</Button>
          )}
          {!stopped && !loading && (
            <Button onClick={() => bid(2)}>Bid 2 tokens</Button>
          )}
          {!stopped && !loading && (
            <Button onClick={() => bid(3)}>Bid 3 tokens</Button>
          )}
          {stopped && !loading && (
            <Button onClick={doIHaveHighestBid}>
              Do I have the highest bid?
            </Button>
          )}
          {stopped && !claimed && highestBid && !loading && (
            <Button onClick={claim}>Claim</Button>
          )}
          {stopped && !highestBid && !loading && (
            <Button onClick={withdraw}>Withdraw</Button>
          )}
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
