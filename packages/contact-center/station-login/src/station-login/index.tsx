import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {StationLoginComponent} from '@webex/cc-components';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLogin: React.FunctionComponent<StationLoginProps> = observer(({onLogin, onLogout, onCCSignOut}) => {
  const {
    cc,
    teams,
    loginOptions,
    logger,
    isAgentLoggedIn,
    showMultipleLoginAlert,
    deviceType,
    dialNumber,
    setDeviceType,
    setDialNumber,
  } = store;
  const result = useStationLogin({
    cc,
    onLogin,
    onLogout,
    logger,
    deviceType,
    dialNumber,
  });

  const dialNumberRegex = cc?.agentConfig?.regexUS;
  const props = {
    ...result,
    setDeviceType,
    setDialNumber,
    teams,
    loginOptions,
    deviceType,
    dialNumber,
    dialNumberRegex,
    isAgentLoggedIn,
    showMultipleLoginAlert,
    onCCSignOut,
  };
  return <StationLoginComponent {...props} />;
});

export {StationLogin};
