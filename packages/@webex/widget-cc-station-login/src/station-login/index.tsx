import React from 'react';
import r2wc from '@r2wc/react-to-web-component';
import store from '@webex/widget-provider';
import {observer} from 'mobx-react';

import StationLoginPresentational from './station-login.presentational';
import {useStationLogin} from '../hooks';

const StationLogin: React.FunctionComponent = observer(() => {
  const {sdk, isAvailable} = store;
  const result = useStationLogin(sdk);

  const props = {
    ...result,
    sdk,
    isAvailable,
  };
  return <StationLoginPresentational {...props} />;
});

const WebStationLogin = r2wc(StationLogin);

export {StationLogin, WebStationLogin};
