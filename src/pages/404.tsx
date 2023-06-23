import * as React from 'react';
import { Link, HeadFC, PageProps } from 'gatsby';
import { Card, CardContent } from '@mui/material';
import { Title } from '../components/Title';
import { withTheme } from '../withTheme';

import './default.css';

const NotFoundPage: React.FC<PageProps> = withTheme(() => {
  return (
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
  );
});

export default NotFoundPage;

export const Head: HeadFC = () => <title>Not found</title>;
