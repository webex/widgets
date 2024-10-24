import React from 'react';
import {IUSEmergencyNumberProps} from './us-emergency-number.types';

const USEmergencyNumberPresentational: React.FunctionComponent<IUSEmergencyNumberProps> = ({name}) => {
  return <h1 data-testid="us-emergency-number-heading">{name}</h1>;
};

export default USEmergencyNumberPresentational;
