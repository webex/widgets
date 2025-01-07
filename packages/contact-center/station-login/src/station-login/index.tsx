import React from 'react';
import 'react-dom';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLogin: React.FunctionComponent<StationLoginProps> = observer(({onLogin, onLogout}) => {
  // @ts-ignore
  window.React2 = React;
  // @ts-ignore
  console.log('station login react, react 2 react 1', window.React2 === window.React1);
  // @ts-ignore
  console.log('station login react, react 2 react 3', window.React2 === window.React3);
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
