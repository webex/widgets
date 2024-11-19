import React from 'react';
import r2wc from '@r2wc/react-to-web-component';
import store from '@webex/cc-store';
import {observer} from 'mobx-react';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../helper';

const StationLogin: React.FunctionComponent = observer((incomingProps) => {
  const {loginState, setLoginState, ccSdk, isAvailable} = store;
  const result = useStationLogin(incomingProps, store);

  const props = {
    ...result,
    loginState,
    setLoginState,
    ccSdk,
    isAvailable,
  };
  return <StationLoginPresentational {...props} />;
});

const WebStationLogin = r2wc(StationLogin, {
  props: {
    sdkConfig: Object,
  },
});

if (!customElements.get('widget-cc-station-login')) {
  customElements.define('widget-cc-station-login', WebStationLogin);
}

export {StationLogin, WebStationLogin};
