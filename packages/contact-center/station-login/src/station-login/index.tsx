import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLoginComponent: React.FunctionComponent<StationLoginProps> = ({onLogin, onLogout}) => {
  const {cc, teams, loginOptions, logger, deviceType, isAgentLoggedIn, handleContinue, showMultipleLoginAlert, setDeviceType, currentTheme} = store;
  const result = useStationLogin({
    cc,
    onLogin,
    onLogout,
    logger,
    isAgentLoggedIn,
    handleContinue,
    showMultipleLoginAlert,
    deviceType
  });

  const props = {
    ...result,
    teams,
    loginOptions,
    deviceType,
    setDeviceType,
    currentTheme
  };
  return <StationLoginPresentational {...props} />;
};

const StationLogin = observer(StationLoginComponent);
export {StationLogin};
