import {useState} from "react";
import {StationLoginSuccess, StationLogoutSuccess} from '@webex/plugin-cc';
import {UseStationLoginProps} from "./station-login/station-login.types";

export const useStationLogin = (props: UseStationLoginProps) => {
  const webex = props.webex;
  const loginReqParam= props.loginReqParam;
  const [loginSuccess, setLoginSuccess] = useState<StationLoginSuccess>();
  const [loginFailure, setLoginFailure] = useState<Error>();
  const [logoutSuccess, setLogoutSuccess] = useState<StationLogoutSuccess>();

  const login = () => {
    webex.cc.stationLogin({teamId: loginReqParam.teamId, loginOption: loginReqParam.loginOption, dialNumber: loginReqParam.dialNumber})
      .then((res: StationLoginSuccess) => {
        console.log('Successful Agent login: ', res);
        setLoginSuccess(res);

      }).catch((error: Error) => {
        console.error(error);
        setLoginFailure(error);
      });
  };

  const logout = () => {
    webex.cc.stationLogout({logoutReason: 'User requested logout'})
      .then((res: StationLogoutSuccess) => {
        console.log('Successful Agent logout: ', res);
        setLogoutSuccess(res);
      }).catch((error: any) => {
        console.error(error);
      });
  };

  return {name: 'StationLogin', login, logout, loginSuccess, loginFailure, logoutSuccess};
}

