import {useState, useEffect} from 'react';
import {StationLoginSuccess, StationLogoutSuccess} from '@webex/plugin-cc';
import {UseStationLoginProps} from './station-login/station-login.types';
import store from '@webex/cc-store'; // we need to import as we are losing the context of this in store
import {AGENT_MULTI_LOGIN} from './station-login/constants';

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
  const [showMultipleLoginAlert, setShowMultipleLoginAlert] = useState(false);

  useEffect(() => {
    const handleMultiLoginCloseSession = (data) => {
      if (data && typeof data === 'object' && data.type === 'AgentMultiLoginCloseSession') {
        setShowMultipleLoginAlert(true);
      }
    };

    cc.on(AGENT_MULTI_LOGIN, handleMultiLoginCloseSession);

    return () => {
      cc.off(AGENT_MULTI_LOGIN, handleMultiLoginCloseSession);
    };
  }, [cc]);

  useEffect(() => {
    setIsAgentLoggedIn(props.isAgentLoggedIn);
  }, [props.isAgentLoggedIn]);

  const handleContinue = async () => {
    try {
      setShowMultipleLoginAlert(false);
      const profile = await cc.register();
      if (profile.isAgentLoggedIn) {
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
        setIsAgentLoggedIn(true);
        store.setSelectedLoginOption(deviceType);
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
        setIsAgentLoggedIn(false);
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
    showMultipleLoginAlert,
    isAgentLoggedIn,
    handleContinue,
  };
};
