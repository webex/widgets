import {useState, useEffect} from 'react';
import {StationLoginSuccess, StationLogoutSuccess} from '@webex/plugin-cc';
import {UseStationLoginProps} from './station-login/station-login.types';
import store from '@webex/cc-store'; // we need to import as we are losing the context of this in store

export const useStationLogin = (props: UseStationLoginProps) => {
  const cc = props.cc;
  const loginCb = props.onLogin;
  const logoutCb = props.onLogout;
  const logger = props.logger;
  const [isAgentLoggedIn, setIsAgentLoggedIn] = useState(props.isAgentLoggedIn);
  const [dialNumber, setDialNumber] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [team, setTeam] = useState('');
  const [loginSuccess, setLoginSuccess] = useState<StationLoginSuccess>();
  const [loginFailure, setLoginFailure] = useState<Error>();
  const [logoutSuccess, setLogoutSuccess] = useState<StationLogoutSuccess>();

  useEffect(() => {
    setIsAgentLoggedIn(props.isAgentLoggedIn);
  }, [props.isAgentLoggedIn]);

  const login = () => {
    cc.stationLogin({teamId: team, loginOption: deviceType, dialNumber: dialNumber})
      .then((res: StationLoginSuccess) => {
        setLoginSuccess(res);
        setIsAgentLoggedIn(true)
        store.setSelectedLoginOption(deviceType);
        if (loginCb) {
          loginCb();
        }
      }).catch((error: Error) => {
        logger.error(`Error logging in: ${error}`, {
          module: 'widget-station-login#helper.ts',
          method: 'login',
        });
        setLoginFailure(error);
      });
  };

  const logout = () => {
    cc.stationLogout({logoutReason: 'User requested logout'})
      .then((res: StationLogoutSuccess) => {
        setLogoutSuccess(res);
        setIsAgentLoggedIn(false);
        if (logoutCb) {
          logoutCb();
        }
      }).catch((error: Error) => {
        logger.error(`Error logging out: ${error}`, {
          module: 'widget-station-login#helper.ts',
          method: 'logout',
        });
      });
  };

  function relogin() {
    store.setSelectedLoginOption(deviceType);
    if (loginCb) {
      loginCb();
    }
  }

  return {
    name: 'StationLogin',
    setDeviceType,
    setDialNumber,
    setTeam,
    login,
    logout,
    relogin,
    loginSuccess,
    loginFailure,
    logoutSuccess,
    isAgentLoggedIn,
  };
};
