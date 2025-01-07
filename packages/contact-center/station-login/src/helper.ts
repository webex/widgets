import {useState} from 'react';
import {StationLoginSuccess, StationLogoutSuccess} from '@webex/plugin-cc';
import {UseStationLoginProps} from './station-login/station-login.types';

export const useStationLogin = (props: UseStationLoginProps) => {
  const cc = props.cc;
  const loginCb = props.onLogin;
  const logoutCb = props.onLogout;
  const [loginSuccess, setLoginSuccess] = useState<StationLoginSuccess>();
  const [loginFailure, setLoginFailure] = useState<Error>();
  const [logoutSuccess, setLogoutSuccess] = useState<StationLogoutSuccess>();

  const login = (teamId: string, loginOption: string, dialNumber: string) => {
    cc.stationLogin({teamId, loginOption, dialNumber})
      .then((res: StationLoginSuccess) => {
        setLoginSuccess(res);
        if (loginCb) {
          loginCb();
        }
      })
      .catch((error: Error) => {
        console.error(error);
        setLoginFailure(error);
      });
  };

  const logout = () => {
    cc.stationLogout({logoutReason: 'User requested logout'})
      .then((res: StationLogoutSuccess) => {
        setLogoutSuccess(res);
        if (logoutCb) {
          logoutCb();
        }
      })
      .catch((error: Error) => {
        console.error(error);
      });
  };

  return {
    name: 'StationLogin',
    login,
    logout,
    loginSuccess,
    loginFailure,
    logoutSuccess,
  };
};
