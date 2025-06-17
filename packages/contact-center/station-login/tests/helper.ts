import {renderHook, act, waitFor} from '@testing-library/react';
import {useStationLogin} from '../src/helper';
import * as store from '@webex/cc-store';

jest.mock('@webex/cc-store', () => {
  let isAgentLoggedIn = false;
  return {
    cc: {},
    teams: ['team123', 'team456'],
    loginOptions: ['EXTENSION', 'AGENT_DN', 'BROWSER'],
    get isAgentLoggedIn() {
      return isAgentLoggedIn; // Getter to return current value
    },
    setIsAgentLoggedIn: jest.fn((value) => {
      isAgentLoggedIn = value; // Update internal variable
    }),
    registerCC: jest.fn(),
    setDeviceType: jest.fn(),
    setDialNumber: jest.fn(),
    setCurrentState: jest.fn(),
    setLastStateChangeTimestamp: jest.fn(),
    setLastIdleCodeChangeTimestamp: jest.fn(),
    setShowMultipleLoginAlert: jest.fn(),
    setLogoutCallback: jest.fn(),
    setCCCallback: jest.fn(),
    removeCCCallback: jest.fn(),
    CC_EVENTS: {
      AGENT_STATION_LOGIN_SUCCESS: 'AgentStationLoginSuccess',
    },
  };
});

// Mock webex instance
const ccMock = {
  stationLogin: jest.fn(),
  stationLogout: jest.fn(),
  deregister: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

// Sample login parameters
const loginParams = {
  teamId: 'team123',
  loginOption: 'EXTENSION',
  dialNumber: '1001',
};

const loginCb = jest.fn();
const logoutCb = jest.fn();
const logger = {
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
};

// Base props for useStationLogin hook
const baseStationLoginProps = {
  cc: ccMock,
  onLogin: loginCb,
  onLogout: logoutCb,
  logger,
  deviceType: 'EXTENSION',
  dialNumber: '',
  onSaveStart: jest.fn(),
  onSaveEnd: jest.fn(),
  teamId: 'team123',
  isAgentLoggedIn: false,
};

describe('useStationLogin Hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
    loginCb.mockClear();
    logoutCb.mockClear();
    logger.log.mockClear();
    logger.error.mockClear();
  });

  it('should set loginSuccess on successful login and set loginFailure to undefined', async () => {
    const successResponse = {
      data: {
        agentId: '6b310dff-569e-4ac7-b064-70f834ea56d8',
        agentSessionId: 'c9c24ace-5170-4a9f-8bc2-2eeeff9d7c11',
        auxCodeId: '00b4e8df-f7b0-460f-aacf-f1e635c87d4d',
        deviceId: '1001',
        deviceType: 'EXTENSION',
        dn: '1001',
        eventType: 'AgentDesktopMessage',
        interactionIds: [],
        lastIdleCodeChangeTimestamp: 1731997914706,
        lastStateChangeTimestamp: 1731997914706,
        orgId: '6ecef209-9a34-4ed1-a07a-7ddd1dbe925a',
        profileType: 'BLENDED',
        roles: ['agent'],
        siteId: 'd64e19c0-53a2-4ae0-ab7e-3ebc778b3dcd',
        status: 'LoggedIn',
        subStatus: 'Idle',
        teamId: 'c789288e-39e3-40c9-8e66-62c6276f73de',
        trackingId: 'f40915b9-07ed-4b6c-832d-e7f5e7af3b72',
        type: 'AgentStationLoginSuccess',
        voiceCount: 1,
      },
    };

    ccMock.stationLogin.mockResolvedValue(successResponse);
    const {result} = renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        deviceType: 'BROWSER',
      })
    );

    act(() => {
      result.current.setTeam(loginParams.teamId);
    });

    await act(async () => {
      await result.current.login();
    });

    await waitFor(async () => {
      expect(ccMock.stationLogin).toHaveBeenCalledWith({
        teamId: loginParams.teamId,
        loginOption: 'BROWSER',
        dialNumber: '',
      });

      expect(result.current).toEqual({
        name: 'StationLogin',
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: successResponse,
        loginFailure: undefined,
        logoutSuccess: undefined,
        handleContinue: expect.any(Function),
        currentLoginOptions: expect.any(Object),
        originalLoginOptions: expect.any(Object),
        isLoginOptionsChanged: expect.any(Boolean),
        saveError: expect.any(String),
        saveLoginOptions: expect.any(Function),
        setCurrentLoginOptions: expect.any(Function),
        dialNumberValue: '',
        selectedDeviceType: 'BROWSER',
        selectedTeamId: 'team123',
        setDialNumberValue: expect.any(Function),
        setSelectedDeviceType: expect.any(Function),
        setSelectedTeamId: expect.any(Function),
      });
    });
  });

  it('should set loginSuccess on successful login without auxCode and last state timestamp', async () => {
    const successResponse = {
      data: {
        agentId: '6b310dff-569e-4ac7-b064-70f834ea56d8',
        agentSessionId: 'c9c24ace-5170-4a9f-8bc2-2eeeff9d7c11',
        lastStateChangeTimestamp: '1234',
        lastIdleCodeChangeTimestamp: '2345',
      },
    };

    ccMock.stationLogin.mockResolvedValue(successResponse);
    const setSetCurrentStateSpy = jest.spyOn(store, 'setCurrentState');
    const setSetLastStateChangeTimestampSpy = jest.spyOn(store, 'setLastStateChangeTimestamp');
    const setSetLastIdleCodeChangeTimestampSpy = jest.spyOn(store, 'setLastIdleCodeChangeTimestamp');

    const {result} = renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        deviceType: '',
      })
    );

    act(() => {
      result.current.setTeam(loginParams.teamId);
    });

    await act(async () => {
      await result.current.login();
    });

    await waitFor(async () => {
      // @ts-expect-error only for testing purposes
      expect(setSetCurrentStateSpy).not.toHaveBeenCalledWith(successResponse.data.auxCodeId);
      expect(setSetLastStateChangeTimestampSpy).not.toHaveBeenCalledWith(
        new Date(successResponse.data.lastStateChangeTimestamp)
      );
      expect(setSetLastIdleCodeChangeTimestampSpy).not.toHaveBeenCalledWith(
        new Date(successResponse.data.lastIdleCodeChangeTimestamp)
      );
    });
  });

  it('should set loginSuccess on successful login without onLogin callback', async () => {
    const successResponse = {
      data: {
        agentId: '6b310dff-569e-4ac7-b064-70f834ea56d8',
        agentSessionId: 'c9c24ace-5170-4a9f-8bc2-2eeeff9d7c11',
      },
    };

    ccMock.stationLogin.mockResolvedValue(successResponse);
    const {result} = renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        onLogin: jest.fn(),
      })
    );

    act(() => {
      result.current.setTeam(loginParams.teamId);
    });

    await act(async () => {
      await result.current.login();
    });

    await waitFor(async () => {
      expect(loginCb).not.toHaveBeenCalledWith();
    });
  });

  it('should not call setDeviceType if login fails', async () => {
    const errorResponse = new Error('Login failed');
    ccMock.stationLogin.mockRejectedValue(errorResponse);
    const setDeviceTypeSpy = jest.spyOn(store, 'setDeviceType');

    loginCb.mockClear();
    const {result} = renderHook(() => useStationLogin(baseStationLoginProps));

    act(() => {
      result.current.setTeam(loginParams.teamId);
    });

    await act(async () => {
      await result.current.login();
    });

    await waitFor(() => {
      expect(ccMock.stationLogin).toHaveBeenCalledWith({
        teamId: loginParams.teamId,
        loginOption: 'EXTENSION',
        dialNumber: '',
      });
      expect(loginCb).not.toHaveBeenCalledWith();

      expect(result.current).toEqual({
        name: 'StationLogin',
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: undefined,
        loginFailure: errorResponse,
        logoutSuccess: undefined,
        handleContinue: expect.any(Function),
        currentLoginOptions: expect.any(Object),
        originalLoginOptions: expect.any(Object),
        isLoginOptionsChanged: expect.any(Boolean),
        saveError: expect.any(String),
        saveLoginOptions: expect.any(Function),
        setCurrentLoginOptions: expect.any(Function),
        dialNumberValue: '',
        selectedDeviceType: 'EXTENSION',
        selectedTeamId: 'team123',
        setDialNumberValue: expect.any(Function),
        setSelectedDeviceType: expect.any(Function),
        setSelectedTeamId: expect.any(Function),
      });

      expect(setDeviceTypeSpy).not.toHaveBeenCalled();
    });
  });

  it('should not call login callback if not present', async () => {
    ccMock.stationLogin.mockResolvedValue({});

    const {result} = renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        onLogin: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.login();
    });

    await waitFor(() => {
      expect(loginCb).not.toHaveBeenCalled();
    });
  });

  it('should set loginFailure on failed login', async () => {
    const errorResponse = new Error('Login failed');
    ccMock.stationLogin.mockRejectedValue(errorResponse);

    loginCb.mockClear();
    const {result} = renderHook(() => useStationLogin(baseStationLoginProps));

    act(() => {
      result.current.setTeam(loginParams.teamId);
    });

    await act(async () => {
      await result.current.login();
    });

    waitFor(() => {
      expect(ccMock.stationLogin).toHaveBeenCalledWith({
        teamId: loginParams.teamId,
        loginOption: loginParams.loginOption,
        dialNumber: loginParams.dialNumber,
      });

      expect(loginCb).not.toHaveBeenCalledWith();

      expect(result.current).toEqual({
        name: 'StationLogin',
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: undefined,
        loginFailure: errorResponse,
        logoutSuccess: undefined,
        handleContinue: expect.any(Function),
        currentLoginOptions: expect.any(Object),
        originalLoginOptions: expect.any(Object),
        isLoginOptionsChanged: expect.any(Boolean),
        saveError: expect.any(String),
        saveLoginOptions: expect.any(Function),
        setCurrentLoginOptions: expect.any(Function),
      });
    });
  });

  it('should set logoutSuccess on successful logout', async () => {
    const successResponse = {
      agentId: '6b310dff-569e-4ac7-b064-70f834ea56d8',
      agentSessionId: '701ba0dc-2075-4867-a753-226ad8e2197a',
      eventTime: 1731998475193,
      eventType: 'AgentDesktopMessage',
      loggedOutBy: 'SELF',
      logoutReason: 'Agent Logged Out',
      orgId: '6ecef209-9a34-4ed1-a07a-7ddd1dbe925a',
      roles: ['agent'],
      status: 'LoggedOut',
      subStatus: 'Idle',
      trackingId: '77170ae4-fd8d-4bf5-bfaa-5f9d8975265c',
      type: 'AgentLogoutSuccess',
    };

    ccMock.stationLogout.mockResolvedValue(successResponse);

    const {result} = renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        deviceType: 'BROWSER',
      })
    );

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(ccMock.stationLogout).toHaveBeenCalledWith({logoutReason: 'User requested logout'});

      expect(result.current).toEqual({
        name: 'StationLogin',
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: undefined,
        loginFailure: undefined,
        logoutSuccess: successResponse,
        handleContinue: expect.any(Function),
        currentLoginOptions: expect.any(Object),
        originalLoginOptions: expect.any(Object),
        isLoginOptionsChanged: expect.any(Boolean),
        saveError: expect.any(String),
        saveLoginOptions: expect.any(Function),
        setCurrentLoginOptions: expect.any(Function),
        dialNumberValue: '',
        selectedDeviceType: 'BROWSER',
        selectedTeamId: 'team123',
        setDialNumberValue: expect.any(Function),
        setSelectedDeviceType: expect.any(Function),
        setSelectedTeamId: expect.any(Function),
      });
    });
  });

  it('should log error on logout failure', async () => {
    ccMock.stationLogout.mockRejectedValue(new Error('Logout failed'));

    const {result} = renderHook(() => useStationLogin(baseStationLoginProps));

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Error logging out: Error: Logout failed', {
        module: 'widget-station-login#helper.ts',
        method: 'logout',
      });
    });
  });

  it('should not call logout callback if not present', async () => {
    ccMock.stationLogout.mockResolvedValue({});

    const {result} = renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        onLogout: jest.fn(),
      })
    );

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(logoutCb).not.toHaveBeenCalled();
    });
  });

  it('should call handleContinue and set device type', async () => {
    store.setIsAgentLoggedIn(true);
    const setShowMultipleLoginAlertSpy = jest.spyOn(store, 'setShowMultipleLoginAlert');
    const registerCCSpy = jest.spyOn(store, 'registerCC');

    const {result} = renderHook(() => useStationLogin(baseStationLoginProps));

    act(() => {
      result.current.handleContinue();
    });

    await waitFor(() => {
      expect(setShowMultipleLoginAlertSpy).toHaveBeenCalledWith(false);
      expect(registerCCSpy).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith('CC-Widgets: Agent Relogin Success', {
        module: 'widget-station-login#station-login/helper.ts',
        method: 'handleContinue',
      });
    });
  });

  it('should call handleContinue with agent not logged in', async () => {
    store.setIsAgentLoggedIn(false);
    const setShowMultipleLoginAlertSpy = jest.spyOn(store, 'setShowMultipleLoginAlert');
    const registerCCSpy = jest.spyOn(store, 'registerCC');

    const {result} = renderHook(() => useStationLogin(baseStationLoginProps));

    act(() => {
      result.current.handleContinue();
    });

    await waitFor(() => {
      expect(setShowMultipleLoginAlertSpy).toHaveBeenCalledWith(false);
      expect(registerCCSpy).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Agent Relogin Failed', {
        module: 'widget-station-login#station-login/helper.ts',
        method: 'handleContinue',
      });
    });
  });

  it('should call handleContinue and handle error', async () => {
    const setShowMultipleLoginAlertSpy = jest.spyOn(store, 'setShowMultipleLoginAlert');
    const registerCCSpy = jest.spyOn(store, 'registerCC').mockImplementation(() => {
      throw Error('Relogin failed');
    });

    const {result} = renderHook(() => useStationLogin(baseStationLoginProps));

    act(() => {
      result.current.handleContinue();
    });

    await waitFor(() => {
      expect(setShowMultipleLoginAlertSpy).toHaveBeenCalledWith(false);
      expect(registerCCSpy).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'CC-Widgets: Error handling agent multi login continue: Error: Relogin failed',
        {
          module: 'widget-station-login#station-login/index.tsx',
          method: 'handleContinue',
        }
      );
    });
  });

  it('should set deviceType, agentState on login success', async () => {
    jest.spyOn(store, 'setCCCallback').mockImplementation((event, cb) => {
      ccMock.on(event, cb);
    });

    renderHook(() => useStationLogin(baseStationLoginProps));

    expect(ccMock.on).toHaveBeenCalledWith(store.CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, expect.any(Function));

    const mockPayload = {
      deviceType: 'EXTENSION',
      auxCodeId: 'mockAuxCodeId',
    };

    act(() => {
      ccMock.on.mock.calls[0][1](mockPayload);
    });

    await waitFor(() => {
      expect(loginCb).toHaveBeenCalled();
    });

    expect(ccMock.on).toHaveBeenCalledWith(store.CC_EVENTS.AGENT_LOGOUT_SUCCESS, expect.any(Function));

    act(() => {
      ccMock.on.mock.calls[1][1]();
    });

    await waitFor(() => {
      expect(logoutCb).toHaveBeenCalled();
    });
  });

  it('should set deviceType, agentState on login success', async () => {
    jest.spyOn(store, 'setCCCallback').mockImplementation((event, cb) => {
      ccMock.on(event, cb);
    });

    renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        logger,
      })
    );

    expect(ccMock.on).toHaveBeenCalledWith(store.CC_EVENTS.AGENT_STATION_LOGIN_SUCCESS, expect.any(Function));

    const mockPayload = {
      deviceType: 'EXTENSION',
      auxCodeId: ' ',
    };

    act(() => {
      ccMock.on.mock.calls[0][1](mockPayload);
    });

    await waitFor(() => {
      expect(loginCb).toHaveBeenCalled();
    });
  });

  it('should not save if isLoginOptionsChanged is false', () => {
    const cc = {updateAgentProfile: jest.fn()};
    const {result} = renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        cc,
        dialNumber: '1001',
        onLogin: jest.fn(),
        onLogout: jest.fn(),
      })
    );

    // No changes made, so isLoginOptionsChanged should be false
    act(() => {
      result.current.saveLoginOptions();
    });

    expect(result.current.saveError).toBe('No changes detected in login options.');
    expect(logger.log).toHaveBeenCalledWith(
      'No changes detected in login options.',
      expect.objectContaining({
        module: 'widget-station-login#station-login/helper.ts',
        method: 'saveLoginOptions',
      })
    );
    expect(cc.updateAgentProfile).not.toHaveBeenCalled();
  });

  it('should call updateAgentProfile and update originalLoginOptions on save when changed', async () => {
    const cc = {updateAgentProfile: jest.fn().mockResolvedValue({})};
    const {result} = renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        cc,
        dialNumber: '1001',
        onLogin: jest.fn(),
        onLogout: jest.fn(),
      })
    );

    // Simulate a change
    act(() => {
      result.current.setCurrentLoginOptions({
        deviceType: 'DIALNUMBER',
        dialNumber: '2002',
      });
    });

    expect(result.current.isLoginOptionsChanged).toBe(true);

    await act(async () => {
      await result.current.saveLoginOptions();
    });

    expect(cc.updateAgentProfile).toHaveBeenCalledWith({
      loginOption: 'DIALNUMBER',
      teamId: undefined,
      dialNumber: '2002',
    });
    expect(logger.log).toHaveBeenCalledWith(
      'Saving login options:',
      expect.objectContaining({
        module: 'widget-station-login#station-login/helper.ts',
        method: 'saveLoginOptions',
        original: expect.any(Object),
        updated: expect.any(Object),
      })
    );
    expect(result.current.saveError).toBe('');
    // After save, originalLoginOptions should match currentLoginOptions
    expect(result.current.originalLoginOptions).toEqual(result.current.currentLoginOptions);
    expect(result.current.isLoginOptionsChanged).toBe(false);
  });

  it('should handle updateAgentProfile errors', async () => {
    const cc = {updateAgentProfile: jest.fn().mockRejectedValue(new Error('fail'))};
    const {result} = renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        cc,
        dialNumber: '1001',
        onLogin: jest.fn(),
        onLogout: jest.fn(),
      })
    );

    // Simulate a change
    act(() => {
      result.current.setCurrentLoginOptions({
        deviceType: 'DIALNUMBER',
        dialNumber: '2002',
      });
    });

    await act(async () => {
      await result.current.saveLoginOptions();
    });

    expect(result.current.saveError).toBe('fail');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to update agent device type',
      expect.any(Error),
      expect.objectContaining({
        module: 'widget-station-login#station-login/helper.ts',
        method: 'saveLoginOptions',
      })
    );
  });

  it('should call updateAgentProfile with no dialNumber when deviceType is BROWSER', async () => {
    const cc = {updateAgentProfile: jest.fn().mockResolvedValue({})};
    const {result} = renderHook(() =>
      useStationLogin({
        ...baseStationLoginProps,
        cc,
        dialNumber: '1234',
        onLogin: jest.fn(),
        onLogout: jest.fn(),
      })
    );

    // Simulate a change to BROWSER (this will make isLoginOptionsChanged true)
    act(() => {
      result.current.setCurrentLoginOptions({
        deviceType: 'BROWSER',
        dialNumber: 'shouldNotBeSent',
      });
    });

    await act(async () => {
      await result.current.saveLoginOptions();
    });

    expect(cc.updateAgentProfile).toHaveBeenCalledWith({
      loginOption: 'BROWSER',
      teamId: undefined,
      // dialNumber should NOT be present
    });

    expect(logger.log).toHaveBeenCalledWith(
      'Saving login options:',
      expect.objectContaining({
        module: 'widget-station-login#station-login/helper.ts',
        method: 'saveLoginOptions',
        original: expect.any(Object),
        updated: expect.any(Object),
      })
    );
  });

  describe('#onCCSignOut', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      ccMock.stationLogout.mockClear();
      ccMock.deregister.mockClear();
    });

    it('should call stationLogout on doStationLogout', async () => {
      const doStationLogout = true;
      const onCCSignOut = jest.fn();
      store.setIsAgentLoggedIn(true);
      ccMock.stationLogout.mockResolvedValue({});
      const {result} = renderHook(() =>
        useStationLogin({
          ...baseStationLoginProps,
          doStationLogout,
          onLogin: jest.fn(),
          onLogout: jest.fn(),
          onCCSignOut,
        })
      );

      await act(async () => {
        await result.current.onCCSignOut();
      });

      await waitFor(() => {
        expect(ccMock.stationLogout).toHaveBeenCalledWith({logoutReason: 'User requested logout'});
        expect(ccMock.deregister).toHaveBeenCalled();
        expect(onCCSignOut).toHaveBeenCalled();
      });
    });

    it('should not call stationLogout if doStationLogout is false', async () => {
      const doStationLogout = false;
      const onCCSignOut = jest.fn();
      store.setIsAgentLoggedIn(true);
      const {result} = renderHook(() =>
        useStationLogin({
          ...baseStationLoginProps,
          doStationLogout,
          onLogin: jest.fn(),
          onLogout: jest.fn(),
          onCCSignOut,
        })
      );

      await act(async () => {
        await result.current.onCCSignOut();
      });

      await waitFor(() => {
        expect(ccMock.stationLogout).not.toHaveBeenCalled();
        expect(ccMock.deregister).not.toHaveBeenCalled();
        expect(onCCSignOut).toHaveBeenCalled();
      });
    });
  });
});
