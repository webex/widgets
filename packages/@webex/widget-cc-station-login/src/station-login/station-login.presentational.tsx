import React from 'react';
import {IStationLoginProps} from './station-login.types';

const StationLoginPresentational: React.FunctionComponent<IStationLoginProps> = (props) => {
  return (
    <>
      <h1 data-testid="station-login-heading">{props.name}</h1>
      <h4>Station Login State: {props.loginState}</h4>
      <button onClick={() => props.setLoginState('Logged In')}>Click to change state</button>
    </>
  );
};

export default StationLoginPresentational;
