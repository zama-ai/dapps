import React, { ChangeEventHandler, MouseEventHandler, SetStateAction, useEffect } from 'react';
import { TextField, Button } from '@mui/material';

import './ContractAddress.css';

export const ContractAddress: React.FC<{
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onConfirm: MouseEventHandler<HTMLButtonElement>;
}> = ({ value, onChange, onConfirm }) => {
  return (
    <div className="ContractAddress">
      <TextField
        label="Contract address"
        id="contractAddress"
        type="text"
        placeholder="0xa3e9437c..."
        onChange={onChange}
        value={value}
        size="small"
        variant="outlined"
        fullWidth
      />
      <Button onClick={onConfirm} variant="contained">
        Confirm
      </Button>
    </div>
  );
};
