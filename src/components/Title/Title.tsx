import React from 'react';
import { Card, CardContent } from '@mui/material';

import logo from './images/zama.png';

import './Title.css';

export const Title: React.FC<{
  children: React.ReactNode;
  right?: React.ReactNode;
}> = ({ children, right = null }) => (
  <Card className="Title">
    <CardContent className="Title__content">
      <h1>
        <img src={logo} alt="Zama" width="40" />
        {children}
      </h1>
      {right && <div className="Title__right">{right}</div>}
    </CardContent>
  </Card>
);
