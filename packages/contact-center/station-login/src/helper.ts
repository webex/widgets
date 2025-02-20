import {useState, useEffect} from 'react';
import {StationLoginSuccess, StationLogoutSuccess} from '@webex/plugin-cc';
import {UseStationLoginProps} from './station-login/station-login.types';
import store from '@webex/cc-store'; // we need to import as we are losing the context of this in store

export const useStationLogin = (props: UseStationLoginProps) => {
  const cc = props.cc;
  const loginCb = props.onLogin;
  const logoutCb = props.onLogout;
  const logger = props.logger;
  const [dialNumber, setDialNumber] = useState('');
  const [deviceType, setDeviceType] = useState(props.deviceType || '');
  const [team, setTeam] = useState('');
  const [loginSuccess, setLoginSuccess] = useState<StationLoginSuccess>();
  const [loginFailure, setLoginFailure] = useState<Error>();
  const [logoutSuccess, setLogoutSuccess] = useState<StationLogoutSuccess>();

  const handleContinue = async () => {
    try {
      store.setShowMultipleLoginAlert(false);
      await store.registerCC();
      if (store.isAgentLoggedIn) {
        logger.log(`Agent Relogin Success`, {
          module: 'widget-station-login#station-login/helper.ts',
          method: 'handleContinue',
        });
      } else {
        logger.error(`Agent Relogin Failed`, {
          module: 'widget-station-login#station-login/helper.ts',
          method: 'handleContinue',
        });
      }
    } catch (error) {
      logger.error(`Error handling agent multi login continue: ${error}`, {
        module: 'widget-station-login#station-login/index.tsx',
        method: 'handleContinue',
      });
    }
  };

  const login = () => {
    cc.stationLogin({teamId: team, loginOption: deviceType, dialNumber: dialNumber})
      .then((res: StationLoginSuccess) => {
        setLoginSuccess(res);
        store.setDeviceType(deviceType);
        store.setIsAgentLoggedIn(true);
        if (res.data.auxCodeId) {
          store.setCurrentState(res.data.auxCodeId);
        }
        if (res.data.lastStateChangeTimestamp) {
          store.setLastStateChangeTimestamp(new Date(res.data.lastStateChangeTimestamp));
        }
        if (loginCb) {
          loginCb();
        }
      })
      .catch((error: Error) => {
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
        store.setIsAgentLoggedIn(false);
        store.setDeviceType('');
        if (logoutCb) {
          logoutCb();
        }
      })
      .catch((error: Error) => {
        logger.error(`Error logging out: ${error}`, {
          module: 'widget-station-login#helper.ts',
          method: 'logout',
        });
      });
  };

  function relogin() {
    store.setDeviceType(deviceType);
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
    handleContinue,
  };
};
