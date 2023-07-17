import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, CardContent } from '@mui/material';
import { BrowserProvider } from 'ethers';
import { Link } from 'gatsby';
import { createInstance } from 'fhevmjs';

import { Title } from '../Title';
import { setInstance } from '../../wallet';

import './Connect.css';

const AUTHORIZED_CHAIN_ID = ['0x1f49', '0x1f4a', '0x1f4b'];

export const Connect: React.FC<{
  children: (account: string, provider: any) => React.ReactNode;
  title: string;
  back?: boolean;
}> = ({ title, back = false, children }) => {
  const [connected, setConnected] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(true);
  const [account, setAccount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const refreshAccounts = async (accounts: string[]) => {
    setAccount(accounts[0] || '');
    setConnected(accounts.length > 0);
  };

  const hasValidNetwork = async (): Promise<boolean> => {
    const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
    return AUTHORIZED_CHAIN_ID.includes(currentChainId.toLowerCase());
  };

  const refreshNetwork = async () => {
    if (await hasValidNetwork()) {
      setWrongNetwork(false);
    } else {
      setWrongNetwork(true);
    }
  };

  const initInstance = async () => {
    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const chainId = +network.chainId.toString();
    let publicKey = localStorage.getItem('fhepubkey');
    if (!publicKey) {
      publicKey = await provider.call({ from: null, to: '0x0000000000000000000000000000000000000044' });
      localStorage.setItem('fhepubkey', publicKey);
    }
    if (chainId !== 9000) throw new Error('Invalid port');
    return createInstance({ chainId, publicKey });
  };

  const refreshProvider = (eth: any) => {
    const p = new BrowserProvider(eth);
    setProvider(p);
    return p;
  };

  useEffect(() => {
    if (wrongNetwork === false) {
      initInstance()
        .then((i) => setInstance(i))
        .catch(() => {});
    }
    refreshProvider((global as any).ethereum);
  }, [connected, wrongNetwork, account]);

  useEffect(() => {
    const eth = (global as any).ethereum;
    if (!eth) {
      setError('No wallet has been found');
      return;
    }

    const p = refreshProvider(eth);

    p.send('eth_accounts', []).then((accounts) => {
      refreshAccounts(accounts);
      refreshNetwork();
    });
    eth.on('accountsChanged', refreshAccounts);
    eth.on('chainChanged', refreshNetwork);
  }, []);

  const connect = async () => {
    if (!provider) {
      return;
    }
    const accounts = await provider.send('eth_requestAccounts', []);

    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setConnected(true);
      if (!(await hasValidNetwork())) {
        await switchNetwork();
      }
    }
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AUTHORIZED_CHAIN_ID[0] }],
      });
    } catch (e) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: AUTHORIZED_CHAIN_ID[0],
            rpcUrls: ['https://devnet.zama.ai/'],
            chainName: 'Zama Devnet',
            nativeCurrency: {
              name: 'ZAMA',
              symbol: 'ZAMA',
              decimals: 18,
            },
            blockExplorerUrls: ['https://explorer.zama.ai'],
          },
        ],
      });
    }
    refreshNetwork();
  };

  const child = useMemo<React.ReactNode>(() => {
    if (!account || !provider) {
      return null;
    }

    if (wrongNetwork) {
      return (
        <Card>
          <CardContent>
            <p>You're not on the correct network</p>
            <p>
              <Button variant="contained" onClick={switchNetwork}>
                Switch to Zama Devnet
              </Button>
            </p>
          </CardContent>
        </Card>
      );
    }

    return children(account, provider);
  }, [account, provider, wrongNetwork]);

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
          <Button variant="outlined" className="Connect__back">
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
