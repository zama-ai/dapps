import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material';
import { theme } from './theme';
import { init } from './wallet';

export const withTheme = <T extends {}>(WrappedComponent: React.ComponentType<T>) => {
  return (props: T) => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      init().then(() => setLoading(false));
    }, []);

    return <ThemeProvider theme={theme}>{!loading && <WrappedComponent {...props} />}</ThemeProvider>;
  };
};
