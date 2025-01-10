import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLogin: React.FunctionComponent<StationLoginProps> = observer(({onLogin, onLogout}) => {
  const {cc, teams, loginOptions, deviceType} = store;
  const result = useStationLogin({cc, onLogin, onLogout});

  console.log('StationLogin: Teams >>', teams);
  console.log('StationLogin: Login Options >>', loginOptions);

  const props = {
    ...result,
    teams,
    loginOptions,
    deviceType,
  };
  return <StationLoginPresentational {...props} />;
});

export {StationLogin};
