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
} from '@mui/material';
import { dayjs } from '../../dayjs';
import { Loader } from '../Loader';

export const Auction: React.FC<{
  claimed: boolean;
  erc20Contract: Contract;
  contract: Contract;
  provider: BrowserProvider;
  stopped: boolean;
  endTime: number | null;
}> = ({ claimed, contract, provider, erc20Contract, stopped, endTime }) => {
  const [erc20Address, setErc20Address] = useState('');
  const [tokenTransferred, setTokenTransferred] = useState(false);
  const [stoppable, setStoppable] = useState(false);
  const [bidCounter, setBidCounter] = useState('0');
  const [dialog, setDialog] = useState('');
  const [loading, setLoading] = useState<string>('');

  const refreshBidCounter = () => {
    contract.bidCounter().then((counter: bigint) => {
      setBidCounter(counter.toString());
    });
  };

  useEffect(() => {
    erc20Contract.getAddress().then(setErc20Address);
    contract.tokenTransferred().then(setTokenTransferred);
    contract.stoppable().then(setStoppable);
    refreshBidCounter();
  }, []);

  const handleClose = () => setDialog('');
  const yesno = (b: boolean) => (b ? 'Yes' : 'No');

  const dateEndTime = endTime ? dayjs.unix(endTime).format('L LTS') : '-';

  const stopAuction = async () => {
    setLoading('Sending transaction...');
    const transaction = await contract.stop();
    setLoading('Waiting for transaction validation...');
    await provider.waitForTransaction(transaction.hash);
    setLoading('');
    setDialog('Auction has been stopped.');
  };

  const auctionEnd = async () => {
    try {
      if (!stopped) {
        return;
      }
      setLoading('Sending transaction...');
      const transaction = await contract.auctionEnd();
      setLoading('Waiting for transaction validation...');
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      setTokenTransferred(true);
      setDialog('Token has been transferred to the beneficiary!');
    } catch (e) {
      setLoading('');
    }
  };

  return (
    <>
      <Card>
        <CardHeader title="Auction" />
        <CardContent>
          <ListItemText primary="Token contract" secondary={erc20Address} />
          <ListItemText primary="Number of bids" secondary={bidCounter} />
          <ListItemText primary="Is stopped?" secondary={yesno(stopped)} />
          {stopped && <ListItemText primary="Claimed" secondary={yesno(claimed)} />}
          {stopped && <ListItemText primary="Tokens has been transferred" secondary={yesno(tokenTransferred)} />}
          <ListItemText primary="End time" secondary={dateEndTime} />
        </CardContent>
        <CardActions>
          <Button onClick={refreshBidCounter}>Refresh bid counter</Button>
          {stoppable && !stopped && !loading && <Button onClick={stopAuction}>Stop auction</Button>}
          {stopped && !tokenTransferred && !loading && (
            <Button onClick={auctionEnd}>Transfer funds to beneficiary</Button>
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
