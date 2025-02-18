import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLoginComponent: React.FunctionComponent<StationLoginProps> = ({onLogin, onLogout, isReadOnly}) => {
  const {cc, teams, loginOptions, logger, isAgentLoggedIn, showMultipleLoginAlert, deviceType, currentTheme, dialNumber, agentName} = store;
  const result = useStationLogin({
    cc,
    onLogin,
    onLogout,
    logger,
    isAgentLoggedIn,
    deviceType,
    dialNumber,
  });

  const props = {
    ...result,
    teams,
    loginOptions,
    currentTheme,
    showMultipleLoginAlert,
    isReadOnly,
    agentName
  };
  return <StationLoginPresentational {...props} showMultipleLoginAlert={showMultipleLoginAlert} />;
};

const StationLogin = observer(StationLoginComponent);
export {StationLogin};
