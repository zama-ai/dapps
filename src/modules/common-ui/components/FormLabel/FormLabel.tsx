import React from 'react';
import { FormLabel as FL, FormLabelProps } from '@mui/material';

import './FormLabel.css';

export const FormLabel = (props: FormLabelProps) => {
  return <FL {...props} className="FormLabel" />;
};
