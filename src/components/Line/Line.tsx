import React from 'react';

import './Line.css';

export const Line: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return <div className="Line">{children}</div>;
};
