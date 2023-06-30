import React, { useEffect, useState } from 'react';
import { BrowserProvider, Contract } from 'ethers';
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
  TextField,
} from '@mui/material';
import { Loader } from '../Loader';
import { getInstance, getTokenSignature } from '../../wallet';

export const Bid: React.FC<{
  abi: any;
  account: string;
  claimed: boolean;
  contract: Contract;
  erc20Contract: Contract;
  provider: BrowserProvider;
  stopped: boolean;
  onClaim: () => void;
}> = ({ abi, account, claimed, contract, erc20Contract, provider, stopped, onClaim }) => {
  const [currentBid, setCurrentBid] = useState('');
  const [symbol, setSymbol] = useState('');
  const [biddingAmount, setBiddingAmount] = useState('');
  const [highestBid, setHighestBid] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<string>('');
  const [dialog, setDialog] = useState('');

  useEffect(() => {
    erc20Contract.symbol().then(setSymbol);
  }, []);

  const getCurrentBid = async () => {
    try {
      const contractAddress = await contract.getAddress();
      const { publicKey, signature } = await getTokenSignature(contractAddress, account);
      const encryptedBid = await contract.getBid(publicKey, signature);
      const bid = getInstance().decrypt(contractAddress, encryptedBid);
      console.log('get', account, bid);

      setCurrentBid(`${bid}`);
    } catch (e) {
      console.log(e);
      setDialog('Error during reencryption!');
    }
  };

  const bid = async () => {
    const value = parseInt(biddingAmount, 10);
    if (!value || Number.isNaN(value)) return;

    try {
      if (stopped) {
        return;
      }
      setLoading(`Encrypting "${value}" and generating ZK proof...`);
      const encryptedErc20Value = getInstance().encrypt32(value);
      setLoading('Sending ERC-20 approve transaction');
      const erc20Transaction = await erc20Contract.approve(await contract.getAddress(), encryptedErc20Value);
      setLoading('Waiting for ERC-20 approve transaction validation...');
      await provider.waitForTransaction(erc20Transaction.hash);

      setLoading(`Encrypting "${value}" and generating ZK proof...`);
      const encryptedValue = getInstance().encrypt32(value);
      setLoading('Sending bid transaction...');

      const transaction = await contract.bid(encryptedValue);
      setLoading('Waiting for bid transaction validation...');
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      setDialog(`You bid ${value} token${value > 1 ? 's' : ''}!`);
    } catch (e) {
      console.log(e);
      setLoading('');
      setDialog('Error during bidding!');
    }
  };

  const doIHaveHighestBid = async () => {
    try {
      if (!stopped) {
        return;
      }
      setLoading('Decrypting do I have highest bid...');
      const contractAddress = await contract.getAddress();
      const { publicKey, signature } = await getTokenSignature(contractAddress, account);
      const ciphertext = await contract.doIHaveHighestBid(publicKey, signature);
      const hb = getInstance().decrypt(contractAddress, ciphertext);
      setHighestBid(Boolean(hb));
      setLoading('');
    } catch (e) {
      setLoading('');
      console.log(e);
      setDialog('Error during reencryption!');
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
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      setDialog('You claimed successfully!');
      onClaim();
    } catch (e) {
      setLoading('');
      setDialog('Error during claim!');
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
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      setDialog('You withdrawed successfully!');
    } catch (e) {
      setLoading('');
      setDialog('Error during withdraw!');
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
          {stopped && <ListItemText primary="Highest bid" secondary={yesno(highestBid)} />}
          {
            <ListItemText
              primary="Your current bid"
              secondary={currentBid === '' ? 'None' : `${currentBid} ${symbol}`}
            />
          }
        </CardContent>
        <CardActions>
          {!loading && <Button onClick={getCurrentBid}>Get my current bid</Button>}
          {stopped && !loading && <Button onClick={doIHaveHighestBid}>Do I have the highest bid?</Button>}
          {stopped && !claimed && highestBid && !loading && <Button onClick={claim}>Claim</Button>}
          {stopped && !highestBid && !loading && <Button onClick={withdraw}>Withdraw</Button>}
          <Loader message={loading} />
        </CardActions>
        <CardActions>
          {!stopped && !loading && (
            <TextField
              size="small"
              variant="outlined"
              value={biddingAmount}
              onChange={(e) => setBiddingAmount(e.target.value)}
              type="number"
            />
          )}
          {!stopped && !loading && (
            <Button onClick={bid} variant="contained">
              Bid
            </Button>
          )}
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
