import React from 'react';
import r2wc from '@r2wc/react-to-web-component';
import store from '@webex/widgets-store';
import {observer} from 'mobx-react';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';

const StationLogin: React.FunctionComponent = observer(() => {
  const {sdk, teams, loginOptions} = store;
  const result = useStationLogin(sdk.webex, teams, loginOptions);

  const props = {
    ...result,
    sdk,
    teams, 
    loginOptions,
  };
  return <StationLoginPresentational {...props} />;
});

const WebStationLogin = r2wc(StationLogin);

if (!customElements.get('widget-cc-station-login')) {
  customElements.define('widget-cc-station-login', WebStationLogin);
}

export {StationLogin, WebStationLogin};
