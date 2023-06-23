import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material';
import { theme } from './theme';
import { Script, withPrefix } from 'gatsby';
import { init } from './wallet';

export const withTheme = <T extends {}>(WrappedComponent: React.ComponentType<T>) => {
  return (props: T) => {
    const [loading, setLoading] = useState(true);

    const initLoader = () => {
      init().then(() => setLoading(false));
    };

    return (
      <ThemeProvider theme={theme}>
        <Script src={withPrefix('static/fhevm.min.js')} onLoad={initLoader} />
        {!loading && <WrappedComponent {...props} />}
      </ThemeProvider>
    );
  };
};
