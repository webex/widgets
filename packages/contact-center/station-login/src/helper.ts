import {useEffect, useState} from 'react';
import {LogoutSuccess, AgentProfileUpdate, LoginOption, StationLoginSuccessResponse} from '@webex/contact-center';
import {UseStationLoginProps} from './station-login/station-login.types';
import store, {CC_EVENTS} from '@webex/cc-store'; // we need to import as we are losing the context of this in store
import {LoginOptionsState} from '@webex/cc-components';

export const useStationLogin = (props: UseStationLoginProps) => {
  const cc = props.cc;
  const loginCb = props.onLogin;
  const logoutCb = props.onLogout;
  const logger = props.logger;
  const isAgentLoggedIn = props.isAgentLoggedIn;
  const dialNumber = props.dialNumber || '';
  const deviceType = props.deviceType || '';
  const teamId = props.teamId || '';
  const onCCSignOut = props.onCCSignOut;
  const doStationLogout =
    props.doStationLogout === undefined || props.doStationLogout === null ? true : props.doStationLogout;
  const [team, setTeam] = useState('');
  const [loginSuccess, setLoginSuccess] = useState<StationLoginSuccessResponse>();
  const [loginFailure, setLoginFailure] = useState<Error>();
  const [logoutSuccess, setLogoutSuccess] = useState<LogoutSuccess>();

  const [dialNumberValue, setDialNumberValue] = useState<string>(dialNumber || '');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || '');
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>(deviceType || '');
  // useEffect to be called on mount

  useEffect(() => {
    try {
      setSelectedDeviceType(deviceType || '');
      setDialNumberValue(dialNumber || '');
      setSelectedTeamId(teamId || '');
    } catch (error) {
      logger.error(`CC-Widgets: Error in useEffect (mount) - ${error.message}`, {
        module: 'widget-station-login#helper.ts',
        method: 'useEffect',
      });
    }
  }, [isAgentLoggedIn]);

  // Track original and current login options as a single object
  const [originalLoginOptions, setOriginalLoginOptions] = useState<LoginOptionsState>({
    deviceType,
    dialNumber,
    teamId: props.teamId || '',
  });
  const [currentLoginOptions, setCurrentLoginOptions] = useState<LoginOptionsState>({
    deviceType,
    dialNumber,
    teamId: props.teamId || '',
  });

  // Error for Save button
  const [saveError, setSaveError] = useState<string>('');

  // Set original login options after successful login
  useEffect(() => {
    try {
      if (store.isAgentLoggedIn) {
        setOriginalLoginOptions({
          deviceType: store.deviceType,
          dialNumber: store.dialNumber,
          teamId: store.teamId || '',
        });
        setCurrentLoginOptions({
          deviceType: store.deviceType,
          dialNumber: store.dialNumber,
          teamId: store.teamId || '',
        });
      }
    } catch (error) {
      logger.error(`CC-Widgets: Error in useEffect (setOriginalLoginOptions) - ${error.message}`, {
        module: 'widget-station-login#helper.ts',
        method: 'useEffect',
      });
    }
  }, [store.isAgentLoggedIn]);

  // Compare logic for Save button
  const isLoginOptionsChanged =
    originalLoginOptions.deviceType !== currentLoginOptions.deviceType ||
    (currentLoginOptions.deviceType !== 'BROWSER' &&
      originalLoginOptions.dialNumber !== currentLoginOptions.dialNumber) ||
    originalLoginOptions.teamId !== currentLoginOptions.teamId;

  const saveLoginOptions = () => {
    try {
      setSaveError('');
      if (!isLoginOptionsChanged) {
        setSaveError('No changes detected in login options.');
        logger.log('No changes detected in login options.', {
          module: 'widget-station-login#helper.ts',
          method: 'saveLoginOptions',
        });
        if (props.onSaveEnd) props.onSaveEnd(false);
        return;
      }

      if (props.onSaveStart) props.onSaveStart();

      // Prepare payload for updateAgentProfile
      const payload: AgentProfileUpdate = {
        loginOption: currentLoginOptions.deviceType as LoginOption,
        teamId: currentLoginOptions.teamId || undefined,
      };
      if (currentLoginOptions.deviceType !== 'BROWSER') {
        payload.dialNumber = currentLoginOptions.dialNumber;
      }

      logger.log('Saving login options:', {
        module: 'widget-station-login#helper.ts',
        method: 'saveLoginOptions',
      });

      cc.updateAgentProfile(payload)
        .then(() => {
          setOriginalLoginOptions({...currentLoginOptions});
          setSaveError('');
          logger.log('Agent profile updated successfully.', {
            module: 'widget-station-login#helper.ts',
            method: 'saveLoginOptions',
          });
          if (props.onSaveEnd) props.onSaveEnd(true);
        })
        .catch((error: Error) => {
          logger.error('Failed to update agent device type', {
            module: 'widget-station-login#helper.ts',
            method: 'saveLoginOptions',
          });
          setSaveError(error.message || 'Failed to update device type');
          if (props.onSaveEnd) props.onSaveEnd(false);
        });
    } catch (error) {
      logger.error(`CC-Widgets: Error in saveLoginOptions - ${error.message}`, {
        module: 'widget-station-login#helper.ts',
        method: 'saveLoginOptions',
      });
      setSaveError('Failed to save login options');
      if (props.onSaveEnd) props.onSaveEnd(false);
    }
  };

  useEffect(() => {
    try {
      if (loginCb && store.isAgentLoggedIn) {
        loginCb();
      }
    } catch (error) {
      logger.error(`CC-Widgets: Error in useEffect (loginCb) - ${error.message}`, {
        module: 'widget-station-login#helper.ts',
        method: 'useEffect',
      });
    }
  }, []);

  const handleLogout = () => {
    try {
      if (logoutCb) {
        logoutCb();
      }
    } catch (error) {
      logger.error(`CC-Widgets: Error in handleLogout - ${error.message}`, {
        module: 'widget-station-login#helper.ts',
        method: 'handleLogout',
      });
    }
  };

  const handleLogin = () => {
    try {
      if (loginCb) {
        loginCb();
      }
    } catch (error) {
      logger.error(`CC-Widgets: Error in handleLogin - ${error.message}`, {
        module: 'widget-station-login#helper.ts',
        method: 'handleLogin',
      });
    }
  };

  const handleCCSignOut = async () => {
    if (doStationLogout && store.isAgentLoggedIn) {
      try {
        await cc.stationLogout({logoutReason: 'User requested logout'});
        await cc.deregister();
      } catch (error) {
        logger.error(`CC-Widgets: Error during station logout: ${error}`, {
          module: 'widget-station-login#helper.ts',
          method: 'handleCCSignOut',
        });
      }
    }
    onCCSignOut();
  };

  // Make sure to set the callback are same and change the logout  logic
  useEffect(() => {
    try {
      store.setCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, handleLogin);
      store.setCCCallback(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogout);

      // TODO: WHen we close this event listener it closes the event listener from storeEventWrapper
      // return () => {
      //   store.removeCCCallback(CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, handleLogin);
      //   store.removeCCCallback(CC_EVENTS.AGENT_LOGOUT_SUCCESS, handleLogout);
      // };
    } catch (error) {
      logger.error(`CC-Widgets: Error in useEffect (setCCCallback) - ${error.message}`, {
        module: 'widget-station-login#helper.ts',
        method: 'useEffect',
      });
    }
  }, [store.isAgentLoggedIn]);

  const handleContinue = async () => {
    try {
      store.setShowMultipleLoginAlert(false);
      await store.registerCC();
      if (store.isAgentLoggedIn) {
        logger.log(`CC-Widgets: Agent Relogin Success`, {
          module: 'widget-station-login#helper.ts',
          method: 'handleContinue',
        });
      } else {
        logger.error(`Agent Relogin Failed`, {
          module: 'widget-station-login#helper.ts',
          method: 'handleContinue',
        });
      }
    } catch (error) {
      logger.error(`CC-Widgets: Error handling agent multi login continue: ${error}`, {
        module: 'widget-station-login#helper.ts',
        method: 'handleContinue',
      });
    }
  };

  const login = () => {
    try {
      cc.stationLogin({teamId: team, loginOption: deviceType, dialNumber})
        .then((res: StationLoginSuccessResponse) => {
          logger.log('CC-Widgets: useStationLogin login(): stationLogin success', {
            module: 'widget-station-login#helper.ts',
            method: 'login',
          });
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
    } catch (error) {
      logger.error(`CC-Widgets: Error in login - ${error.message}`, {
        module: 'widget-station-login#helper.ts',
        method: 'login',
      });
      setLoginSuccess(undefined);
      setLoginFailure(error);
    }
  };

  const logout = () => {
    try {
      logger.info('CC-Widgets: useStationLogin logout(): invoking stationLogout', {
        module: 'widget-station-login#helper.ts',
        method: 'logout',
      });
      cc.stationLogout({logoutReason: 'User requested logout'})
        .then((res: LogoutSuccess) => {
          logger.log('CC-Widgets: useStationLogin logout(): stationLogout success', {
            module: 'widget-station-login#helper.ts',
            method: 'logout',
          });
          setLogoutSuccess(res);
        })
        .catch((error: Error) => {
          logger.error(`CC-Widgets: Error logging out: ${error}`, {
            module: 'widget-station-login#helper.ts',
            method: 'logout',
          });
        });
    } catch (error) {
      logger.error(`CC-Widgets: Error in logout - ${error.message}`, {
        module: 'widget-station-login#helper.ts',
        method: 'logout',
      });
    }
  };

  const handleSetTeam = (teamValue: string) => {
    try {
      setTeam(teamValue);
    } catch (error) {
      logger.error(`CC-Widgets: Error in setTeam - ${error.message}`, {
        module: 'widget-station-login#helper.ts',
        method: 'setTeam',
      });
    }
  };

  return {
    name: 'StationLogin',
    setTeam: handleSetTeam,
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
    setSelectedDeviceType,
    selectedDeviceType,
    dialNumberValue,
    setDialNumberValue,
    setSelectedTeamId,
    selectedTeamId,
    onCCSignOut: onCCSignOut ? handleCCSignOut : undefined,
  };
};
