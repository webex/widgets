import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLogin: React.FunctionComponent<StationLoginProps> = observer(({onLogin, onLogout}) => {
  const {cc, teams, loginOptions, logger, deviceType, isAgentLoggedIn} = store;
  const result = useStationLogin({cc, onLogin, onLogout, logger, isAgentLoggedIn});

  const props = {
    ...result,
    teams,
    loginOptions,
    cc,
    deviceType,
  };
  return <StationLoginPresentational {...props} />;
});

export {StationLogin};
