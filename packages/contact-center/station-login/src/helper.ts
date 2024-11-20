import {useState} from "react";
import {StationLoginSuccess, StationLogoutSuccess} from '@webex/plugin-cc';
import {UseStationLoginProps} from "./station-login/station-login.types";

export const useStationLogin = (props: UseStationLoginProps) => {
  const cc = props.cc;
  const loginCb = props.onLogin;
  const logoutCb = props.onLogout;
  const [dialNumber, setDialNumber] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [team, setTeam] = useState('');
  const [loginSuccess, setLoginSuccess] = useState<StationLoginSuccess>();
  const [loginFailure, setLoginFailure] = useState<Error>();
  const [logoutSuccess, setLogoutSuccess] = useState<StationLogoutSuccess>();

  const login = () => {
    cc.stationLogin({teamId: team, loginOption: deviceType, dialNumber: dialNumber})
      .then((res: StationLoginSuccess) => {
        setLoginSuccess(res);
        loginCb();
      }).catch((error: Error) => {
        console.error(error);
        setLoginFailure(error);
      });
  };

  const logout = () => {
    cc.stationLogout({logoutReason: 'User requested logout'})
      .then((res: StationLogoutSuccess) => {
        setLogoutSuccess(res);
        logoutCb();
      }).catch((error: any) => {
        console.error(error);
      });
  };

  return {name: 'StationLogin', setDeviceType, setDialNumber, setTeam, login, logout, loginSuccess, loginFailure, logoutSuccess};
}

