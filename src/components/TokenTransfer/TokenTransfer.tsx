import React, { useState } from 'react';
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
  TextField,
} from '@mui/material';
import { Loader } from '../Loader';
import { getInstance } from '../../wallet';

export const TokenTransfer: React.FC<{
  contract: Contract;
  provider: any;
}> = ({ contract, provider }) => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState<string>('');
  const [dialog, setDialog] = useState('');

  const transfer = async () => {
    try {
      if (!amount || Number.isNaN(Number(amount))) {
        setDialog('Amount must be a number.');
        return;
      }
      setLoading(`Encrypting "${Number(amount)}" and generating ZK proof...`);
      const encryptedAmount = await getInstance().encrypt32(Number(amount));
      setLoading('Sending transaction...');
      const transaction = await contract['transfer(address,bytes)'](address, encryptedAmount);
      setLoading('Waiting for transaction validation...');
      await provider.waitForTransaction(transaction.hash);
      setLoading('');
      setDialog('The transfer has been done!');
    } catch (e) {
      console.log(e);
      setLoading('');
      setDialog('Error during transfer!');
    }
  };

  const handleClose = () => setDialog('');

  return (
    <Card>
      <CardHeader title="Transfer" />
      <CardContent>
        <TextField
          label="Address"
          id="address"
          type="text"
          placeholder="0xa3e9437c..."
          onChange={(e) => setAddress(e.target.value)}
          value={address}
          size="small"
          variant="outlined"
        />
        <TextField
          label="Amount"
          id="address"
          type="number"
          placeholder=""
          onChange={(e) => setAmount(e.target.value)}
          value={amount}
          size="small"
          variant="outlined"
        />
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
      </CardContent>
      <CardActions>
        {!loading && <Button onClick={transfer}>Transfer</Button>}
        <Loader message={loading} />
      </CardActions>
    </Card>
  );
};
