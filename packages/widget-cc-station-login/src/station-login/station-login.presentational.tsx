import React from 'react';
import {IStationLoginProps} from './station-login.types';

const StationLoginPresentational: React.FunctionComponent<IStationLoginProps> = ({name}) => {
  return <h1 data-testid="station-login-heading">{name}</h1>;
};

export default StationLoginPresentational;
