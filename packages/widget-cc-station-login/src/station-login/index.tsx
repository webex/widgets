import React from 'react';
import {useStationLogin} from './station-login.hooks';
import StationLoginPresentational from './station-login.presentational';

export const StationLogin: React.FunctionComponent = () => {
  const result = useStationLogin();
  return <StationLoginPresentational {...result} />;
};

export default StationLogin;
