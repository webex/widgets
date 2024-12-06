import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLogin: React.FunctionComponent<StationLoginProps> = observer(({onLogin, onLogout}) => {
  const {cc, teams, loginOptions} = store;
  const result = useStationLogin({cc, onLogin, onLogout});

  const props = {
    ...result,
    teams,
    loginOptions,
  };
  return <StationLoginPresentational {...props} />;
});

export {StationLogin};
