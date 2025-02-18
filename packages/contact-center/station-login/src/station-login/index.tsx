import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLoginComponent: React.FunctionComponent<StationLoginProps> = ({onLogin, onLogout}) => {
  const {cc, teams, loginOptions, logger, isAgentLoggedIn, showMultipleLoginAlert, deviceType, currentTheme} = store;
  const result = useStationLogin({
    cc,
    onLogin,
    onLogout,
    logger,
    isAgentLoggedIn,
    deviceType,
  });

  const props = {
    ...result,
    teams,
    loginOptions,
    deviceType,
    currentTheme,
    showMultipleLoginAlert
  };
  return <StationLoginPresentational {...props} showMultipleLoginAlert={showMultipleLoginAlert} />;
};

const StationLogin = observer(StationLoginComponent);
export {StationLogin};
