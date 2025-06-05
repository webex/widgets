import {useEffect, useState} from 'react';
import {StationLoginSuccess, StationLogoutSuccess, AgentProfileUpdate, LoginOption} from '@webex/plugin-cc';
import {UseStationLoginProps} from './station-login/station-login.types';
import store, {CC_EVENTS} from '@webex/cc-store'; // we need to import as we are losing the context of this in store
import {LoginOptionsState} from '@webex/cc-components';

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

  // Track original and current login options as a single object
  const [originalLoginOptions, setOriginalLoginOptions] = useState<LoginOptionsState>({
    deviceType,
    dialNumber,
  });
  const [currentLoginOptions, setCurrentLoginOptions] = useState<LoginOptionsState>({
    deviceType,
    dialNumber,
  });

  // Error for Save button
  const [saveError, setSaveError] = useState<string>('');

  // Set original login options after successful login
  useEffect(() => {
    if (store.isAgentLoggedIn) {
      setOriginalLoginOptions({
        deviceType: store.deviceType,
        dialNumber: store.dialNumber,
      });
      setCurrentLoginOptions({
        deviceType: store.deviceType,
        dialNumber: store.dialNumber,
      });
    }
  }, [store.isAgentLoggedIn]);

  // Compare logic for Save button
  const isLoginOptionsChanged =
    originalLoginOptions.deviceType !== currentLoginOptions.deviceType ||
    (currentLoginOptions.deviceType !== 'BROWSER' &&
      originalLoginOptions.dialNumber !== currentLoginOptions.dialNumber);

  const saveLoginOptions = () => {
    setSaveError('');
    if (!isLoginOptionsChanged) {
      setSaveError('No changes detected in login options.');
      logger.log('No changes detected in login options.', {
        module: 'widget-station-login#station-login/helper.ts',
        method: 'saveLoginOptions',
      });
      if (props.onSaveEnd) props.onSaveEnd(false);
      return;
    }
    logger.log('Saving login options:', {
      module: 'widget-station-login#station-login/helper.ts',
      method: 'saveLoginOptions',
      original: originalLoginOptions,
      updated: currentLoginOptions,
    });

    if (props.onSaveStart) props.onSaveStart();

    // Prepare payload for updateAgentProfile
    const payload: AgentProfileUpdate = {
      loginOption: currentLoginOptions.deviceType as LoginOption,
      teamId: store.teamId ?? undefined,
    };
    if (currentLoginOptions.deviceType !== 'BROWSER') {
      payload.dialNumber = currentLoginOptions.dialNumber;
    }

    cc.updateAgentProfile(payload)
      .then(() => {
        setOriginalLoginOptions({...currentLoginOptions});
        setSaveError('');
        logger.log('Agent profile updated successfully.', {
          module: 'widget-station-login#station-login/helper.ts',
          method: 'saveLoginOptions',
        });
        if (props.onSaveEnd) props.onSaveEnd(true);
      })
      .catch((error: Error) => {
        logger.error('Failed to update agent device type', error, {
          module: 'widget-station-login#station-login/helper.ts',
          method: 'saveLoginOptions',
        });
        setSaveError(error.message || 'Failed to update device type');
        if (props.onSaveEnd) props.onSaveEnd(false);
      });
  };

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
    cc.stationLogin({teamId: team, loginOption: deviceType, dialNumber: dialNumber})
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
    originalLoginOptions,
    currentLoginOptions,
    setCurrentLoginOptions,
    isLoginOptionsChanged,
    saveLoginOptions,
    saveError,
  };
};
