import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent } from '@mui/material';
import { ethers } from 'ethers';
import { Link } from 'gatsby';

import './Connect.css';
import { Title } from '../Title';

export const Connect: React.FC<{
  children: (account: string, provider: any) => React.ReactNode;
  title: string;
  back?: boolean;
}> = ({ title, back = false, children }) => {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<any | null>(null);

  const child = useMemo<React.ReactNode>(() => {
    if (!account || !provider) {
      return null;
    }
    return children(account, provider);
  }, [account, provider]);

  const refreshAccounts = async (accounts: string[]) => {
    setAccount(accounts[0] || '');
    setConnected(accounts.length > 0);
  };

  useEffect(() => {
    if (!global.ethereum) {
      setError('No wallet has been found');
      return;
    }
    const p = new ethers.providers.Web3Provider(global.ethereum);
    setProvider(p);
    p.send('eth_accounts', []).then(refreshAccounts);
    global.ethereum.on('accountsChanged', refreshAccounts);
  }, []);

  const connect = async () => {
    if (!provider) {
      return;
    }
    const accounts = await provider.send('eth_requestAccounts', []);

    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setConnected(true);
    }
  };

  if (error) {
    return (
      <>
        <Title>{title}</Title>
        <Card>
          <CardContent>No wallet has been found.</CardContent>
        </Card>
      </>
    );
  }

  const right = (
    <>
      {!connected && (
        <Button onClick={connect} variant="contained">
          Connect your wallet
        </Button>
      )}
      {connected && <div className="Connect__account">Connected with {account}</div>}
      {back && (
        <p>
          <Button variant="outlined">
            <Link to="/">Back to list</Link>
          </Button>
        </p>
      )}
    </>
  );

  return (
    <>
      <Title right={right}>{title}</Title>
      <div className="Connect__child">{child}</div>
    </>
  );
};
