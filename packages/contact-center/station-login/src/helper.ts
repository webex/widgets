import {useEffect, useState} from 'react';
import {StationLoginSuccess, StationLogoutSuccess} from '@webex/plugin-cc';
import {UseStationLoginProps} from './station-login/station-login.types';
import store, {CC_EVENTS} from '@webex/cc-store'; // we need to import as we are losing the context of this in store

export const useStationLogin = (props: UseStationLoginProps) => {
  const cc = props.cc;
  const loginCb = props.onLogin;
  const logoutCb = props.onLogout;
  const logger = props.logger;
  const dialNumber = props.dialNumber || '';
  const deviceType = props.deviceType || '';
  const [team, setTeam] = useState('');
  const [loginSuccess, setLoginSuccess] = useState<StationLoginSuccess>();
  const [loginFailure, setLoginFailure] = useState<Error>();
  const [logoutSuccess, setLogoutSuccess] = useState<StationLogoutSuccess>();

  useEffect(() => {
    if (loginCb && store.isAgentLoggedIn) {
      loginCb();
    }
  }, []);

  const handleLogout = () => {
    if (logoutCb) {
      logoutCb();
    }
  };

  const handleLogin = () => {
    if (loginCb) {
      loginCb();
    }
  };

  // Make sure to set the callback are same and change the logout  logic
  useEffect(() => {
    store.setCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, handleLogin);
    store.setCCCallback(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogout);

    // TODO: WHen we close this event listener it closes the event listener from storeEventWrapper
    // return () => {
    //   store.removeCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, handleLogin);
    //   store.removeCCCallback(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogout);
    // };
  }, [store.isAgentLoggedIn]);

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
    logger.log('useStationLogin login(): invoking stationLogin', {
      module: 'station-login/helper.ts',
      method: 'login',
    });
    cc.stationLogin({teamId: team, loginOption: deviceType, dialNumber})
      .then((res: StationLoginSuccess) => {
        setLoginSuccess(res);
        setLoginFailure(undefined);
      })
      .catch((error: Error) => {
        logger.error(`Error logging in: ${error}`, {
          module: 'widget-station-login#helper.ts',
          method: 'login',
        });
        setLoginSuccess(undefined);
        setLoginFailure(error);
      });
  };

  const logout = () => {
    logger.log('useStationLogin logout(): invoking stationLogout', {
      module: 'station-login/helper.ts',
      method: 'logout',
    });
    cc.stationLogout({logoutReason: 'User requested logout'})
      .then((res: StationLogoutSuccess) => {
        setLogoutSuccess(res);
      })
      .catch((error: Error) => {
        logger.error(`Error logging out: ${error}`, {
          module: 'widget-station-login#helper.ts',
          method: 'logout',
        });
      });
  };

  return {
    name: 'StationLogin',
    setTeam,
    login,
    logout,
    loginSuccess,
    loginFailure,
    logoutSuccess,
    handleContinue,
  };
};
