import React, { useState } from 'react';
import { Button, CardActions } from '@mui/material';

import './ContractDeploy.css';
import { Loader } from '../Loader';

export const ContractDeploy: React.FC<{
  onDeploy: () => Promise<void>;
  title: string;
}> = ({ title, onDeploy }) => {
  const [loading, setLoading] = useState<string>('');

  const handleDeploy = async () => {
    setLoading('Deploying your contract...');
    try {
      await onDeploy();
    } catch (e) {}
    setLoading('');
  };
  return (
    <div className="ContractDeploy">
      <Button onClick={handleDeploy} disabled={!!loading} variant="contained">
        Deploy a {title}
      </Button>

      <Loader message={loading} />
    </div>
  );
};
