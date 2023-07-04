import React, { ChangeEventHandler, MouseEventHandler, SetStateAction, useEffect } from 'react';
import { TextField, Button } from '@mui/material';

import './ContractAddress.css';
import { ContractDeploy } from '../ContractDeploy';

export const ContractAddress: React.FC<{
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onConfirm: MouseEventHandler<HTMLButtonElement>;
  onDeploy?: () => Promise<void>;
  title: string;
}> = ({ value, onChange, onConfirm, onDeploy, title }) => {
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
      <div className="ContractAddress__actions">
        <Button onClick={onConfirm} variant="contained">
          Confirm
        </Button>
        {onDeploy && <ContractDeploy onDeploy={onDeploy} title={title} />}
      </div>
    </div>
  );
};
