import React from 'react';
import r2wc from '@r2wc/react-to-web-component';
import store from '@webex/cc-store';
import {observer} from 'mobx-react';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';

const StationLogin: React.FunctionComponent = observer(() => {
  const {webex, teams, loginOptions, loginReqParam, setDeviceType, setDialNumber, setTeam} = store;
  const result = useStationLogin({webex, loginReqParam});

  const props = {
    ...result,
    teams,
    loginOptions,
    setDeviceType,
    setDialNumber,
    setTeam
  };
  return <StationLoginPresentational {...props} />;
});

const WebStationLogin = r2wc(StationLogin);

if (!customElements.get('widget-cc-station-login')) {
  customElements.define('widget-cc-station-login', WebStationLogin);
}

export {StationLogin, WebStationLogin};
