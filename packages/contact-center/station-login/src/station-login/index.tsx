import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLoginComponent: React.FunctionComponent<StationLoginProps> = ({onLogin, onLogout}) => {
  const {cc, teams, loginOptions, logger, deviceType, isAgentLoggedIn, handleContinue, showMultipleLoginAlert} = store;
  const result = useStationLogin({
    cc,
    onLogin,
    onLogout,
    logger,
    isAgentLoggedIn,
    handleContinue,
    showMultipleLoginAlert,
  });

  const props = {
    ...result,
    teams,
    loginOptions,
    deviceType,
  };
  return <StationLoginPresentational {...props} />;
};

const StationLogin = observer(StationLoginComponent);
export {StationLogin};
