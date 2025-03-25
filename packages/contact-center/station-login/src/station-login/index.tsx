import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {StationLoginComponent, StationLoginProps} from '@webex/cc-components';
import {useStationLogin} from '../helper';

const StationLogin: React.FunctionComponent<StationLoginProps> = observer(({onLogin, onLogout}) => {
  const {cc, teams, loginOptions, logger, isAgentLoggedIn, showMultipleLoginAlert, deviceType} = store;
  const result = useStationLogin({
    cc,
    onLogin,
    onLogout,
    logger,
    deviceType,
  });

  const props = {
    ...result,
    teams,
    loginOptions,
    deviceType,
    isAgentLoggedIn,
    showMultipleLoginAlert,
  };
  return <StationLoginComponent {...props} />;
});

export {StationLogin};
