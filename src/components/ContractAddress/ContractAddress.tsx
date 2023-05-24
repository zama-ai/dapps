import React, { ChangeEventHandler, SetStateAction, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
} from '@mui/material';

import './ContractAddress.css';

export const ContractAddress: React.FC<{
  onConfirm: React.Dispatch<SetStateAction<string>>;
  title: string;
  storageKey: string;
}> = ({ onConfirm, title, storageKey }) => {
  const [inputAddress, setInputAddress] = React.useState<string>('');

  useEffect(() => {
    const storedInputAddress = localStorage.getItem(storageKey);
    if (storedInputAddress) {
      setInputAddress(storedInputAddress);
    }
  }, []);

  const onChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setInputAddress(e.target.value);
  };

  const handleConfirm = () => {
    if (!inputAddress || ethers.utils.isAddress(inputAddress)) {
      localStorage.setItem(storageKey, inputAddress);
      onConfirm(inputAddress);
    }
  };

  return (
    <Card className="ContractAddress">
      <CardHeader title={title} subheader="Define your contract address" />
      <CardContent className="ContractAddress__content">
        <TextField
          label="Contract address"
          id="contractAddress"
          type="text"
          placeholder="0xa3e9437c..."
          onChange={onChange}
          value={inputAddress}
          size="small"
          variant="outlined"
          fullWidth
        />
        <Button onClick={handleConfirm} variant="contained">
          Confirm
        </Button>
      </CardContent>
    </Card>
  );
};
