import React from 'react';
import store from '@webex/cc-store';
import {observer} from 'mobx-react-lite';

import {StationLoginComponent} from '@webex/cc-components';
import {useStationLogin} from '../helper';
import {StationLoginProps} from './station-login.types';

const StationLogin: React.FunctionComponent<StationLoginProps> = observer(
  ({onLogin, onLogout, contactCenterLogoutFn}) => {
    const {
      cc,
      teams,
      loginOptions,
      logger,
      isAgentLoggedIn,
      showMultipleLoginAlert,
      deviceType,
      dialNumber,
      setDeviceType,
      setDialNumber,
    } = store;
    const result = useStationLogin({
      cc,
      onLogin,
      onLogout,
      logger,
      deviceType,
      dialNumber,
    });

    const props = {
      ...result,
      setDeviceType,
      setDialNumber,
      teams,
      loginOptions,
      deviceType,
      dialNumber,
      isAgentLoggedIn,
      showMultipleLoginAlert,
      contactCenterLogoutFn,
    };
    return <StationLoginComponent {...props} />;
  }
);

export {StationLogin};
