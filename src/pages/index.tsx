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
      <Card className="Title">
        <CardHeader title="dApp list" subheader="Web application on Zama testnet" />
        <CardContent>
          <ul className="links">
            <li>
              <Link to="/eip712/">EIP712</Link>
            </li>
            <li>
              <Link to="/erc20/">ERC20 Explorer (not working)</Link>
            </li>
            <li>
              <Link to="/blind-auction/">Blind auction (not working)</Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </main>
  );
});

export default Index;

export const Head: HeadFC = () => <title>Zama dApps</title>;
