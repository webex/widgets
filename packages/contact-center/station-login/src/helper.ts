import {useEffect, useState} from 'react';
import {StationLoginSuccess, StationLogoutSuccess} from '@webex/plugin-cc';
import {UseStationLoginProps} from './station-login/station-login.types';
import store, {CC_EVENTS} from '@webex/cc-store'; // we need to import as we are losing the context of this in store
import {runInAction} from 'mobx';

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

  useEffect(() => {
    if (loginCb && store.isAgentLoggedIn) {
      loginCb();
    }
  }, []);

  // Make sure to set the callback are same and change the logout  logic
  useEffect(() => {
    if (logoutCb) store.setLogoutCallback(logoutCb);

    store.setCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, (payload) => {
      runInAction(() => {
        store.setDeviceType(payload.deviceType);
        store.setIsAgentLoggedIn(true);
        store.setCurrentState(payload.auxCodeId?.trim() !== '' ? payload.auxCodeId : '0');
      });
      setDialNumber(payload.dn);
      if (loginCb) {
        loginCb();
      }
    });

    return () => {
      store.removeCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS);
    };
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
    cc.stationLogin({teamId: team, loginOption: deviceType, dialNumber: dialNumber})
      .then((res: StationLoginSuccess) => {
        setLoginSuccess(res);
        if (res.data.auxCodeId) {
          store.setCurrentState(res.data.auxCodeId);
        }
        store.setLastStateChangeTimestamp(res.data.lastStateChangeTimestamp);
        store.setLastIdleCodeChangeTimestamp(res.data.lastIdleCodeChangeTimestamp);
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
    setDeviceType,
    setDialNumber,
    setTeam,
    login,
    logout,
    loginSuccess,
    loginFailure,
    logoutSuccess,
    handleContinue,
  };
};
