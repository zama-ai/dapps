import React from 'react';
import { Link, HeadFC, PageProps } from 'gatsby';
import { Card, CardContent, CardHeader } from '@mui/material';
import { Title } from '../components/Title';

import './default.css';
import './index.css';
import { withTheme } from '../withTheme';

const Index: React.FC<PageProps> = withTheme(() => {
  return (
    <main className="Main">
      <Title>Zama dApps</Title>
      <Card className="Index">
        <CardHeader title="dApp list" subheader="Web application on Zama testnet" />
        <CardContent>
          <ul className="links">
            <li>
              <Link to="/eip712/">EIP-712</Link>
            </li>
            <li>
              <Link to="/erc20/">ERC-20</Link>
            </li>
            <li>
              <Link to="/blind-auction/">Blind auction</Link>
            </li>
            <li>
              <Link to="/private-bet/">Private bet</Link>
            </li>
          </ul>
        </CardContent>
      </Card>
      <Card className="Index">
        <CardHeader title="Faucet" subheader="Get some tokens !" />
        <CardContent>
          <p>
            If you want to interact with the devnet, you should&nbsp;
            <Link className="faucet" to="https://faucet.zama.ai/">
              get some tokens
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
});

export default Index;

export const Head: HeadFC = () => <title>Zama dApps</title>;
