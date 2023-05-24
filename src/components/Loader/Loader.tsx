import React from 'react';
import { CircularProgress } from '@mui/material';
import './Loader.css';

export const Loader: React.FC<{ message: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="Loader">
      <CircularProgress size="20px" /> {message}
    </div>
  );
};
