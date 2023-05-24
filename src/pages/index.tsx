import * as React from 'react';
import { Link, HeadFC, PageProps } from 'gatsby';
import { ThemeProvider } from '@mui/material/styles';
import { Card, CardContent, CardHeader } from '@mui/material';
import { theme } from '../theme';
import { Title } from '../components/Title';

import './default.css';
import './index.css';

const NotFoundPage: React.FC<PageProps> = () => {
  return (
    <ThemeProvider theme={theme}>
      <main className="Main">
        <Title>Zama dApps</Title>
        <Card className="Title">
          <CardHeader title="dApp list" subheader="Web application on Zama testnet" />
          <CardContent>
            <ul className="links">
              <li>
                <Link to="/erc20/">ERC20 Explorer</Link>
              </li>
              <li>
                <Link to="/blind-auction/">Blind auction</Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </ThemeProvider>
  );
};

export default NotFoundPage;

export const Head: HeadFC = () => <title>Zama dApps</title>;
