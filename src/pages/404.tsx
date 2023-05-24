import * as React from 'react';
import { Link, HeadFC, PageProps } from 'gatsby';
import { ThemeProvider } from '@mui/material/styles';
import { Card, CardContent } from '@mui/material';
import { theme } from '../theme';
import { Title } from '../components/Title';

import './default.css';

const NotFoundPage: React.FC<PageProps> = () => {
  return (
    <ThemeProvider theme={theme}>
      <main className="Main">
        <Title>Page not found</Title>
        <Card className="Title">
          <CardContent>
            <p>
              Sorry 😔, we couldn’t find what you were looking for.
              <br />
              <br />
              <Link to="/">Go home</Link>.
            </p>
          </CardContent>
        </Card>
      </main>
    </ThemeProvider>
  );
};

export default NotFoundPage;

export const Head: HeadFC = () => <title>Not found</title>;
