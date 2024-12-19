import React from 'react';
import r2wc from '@r2wc/react-to-web-component';
import store from '@webex/cc-store';
import {observer} from 'mobx-react';
import {configure} from 'mobx';
configure({isolateGlobalState: true});

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
    userRole: 'Agent',
    // selectedUserRole: 'Agent',
    // callMonitoringEnabled: false,
    // defaultTeam: 'Debit Card',
    // extensions: '1234',
    // defaultDn: '1234',
    // forceDefaultDnChecked: false,
    // dialNumbers: '1234',
    // extensionErrors: '',
    // dialNumberErrors: '',
    // getVoiceOptions: '',
  };
  return <StationLoginPresentational {...props} />;
});

const WebStationLogin = r2wc(StationLogin, {
  props: {
    onLogin: 'function',
    onLogout: 'function',
  },
});

if (!customElements.get('widget-cc-station-login')) {
  customElements.define('widget-cc-station-login', WebStationLogin);
}

export {StationLogin, WebStationLogin};
