import React from 'react';
import {useUSEmergencyNumber} from './us-emergency-number.hooks';
import USEmergencyNumberPresentational from './us-emergency-number.presentational';

export const USEmergencyNumber: React.FunctionComponent = () => {
  const result = useUSEmergencyNumber();

  return <USEmergencyNumberPresentational {...result} />;
};

export default USEmergencyNumber;
