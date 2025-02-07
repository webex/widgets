import React from 'react';
import {renderHook, act, waitFor} from '@testing-library/react';
import {useStationLogin} from '../src/helper';

const teams = ['team123', 'team456'];
const loginOptions = ['EXTENSION', 'AGENT_DN', 'BROWSER'];

jest.mock('@webex/cc-store', () => {
  return {
    cc: {},
    teams,
    loginOptions,
    setSelectedLoginOption: jest.fn(),
    setCurrentState: jest.fn(),
    setLastStateChangeTimestamp: jest.fn(),
  };
});

// Mock webex instance
const ccMock = {
  stationLogin: jest.fn(),
  stationLogout: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  register: jest.fn(),
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
  error: jest.fn(),
};
const isAgentLoggedIn = false;

describe('useStationLogin Hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
    loginCb.mockClear();
    logoutCb.mockClear();
    logger.log.mockClear();
    logger.error.mockClear();
  });

  it('should set loginSuccess on successful login', async () => {
    const successResponse = {data: {
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
    }};

    ccMock.stationLogin.mockResolvedValue(successResponse);
    const setSelectedLoginOptionSpy = jest.spyOn(require('@webex/cc-store'), 'setSelectedLoginOption');
    const setSetCurrentStateSpy = jest.spyOn(require('@webex/cc-store'), 'setCurrentState');
    const setSetLastStateChangeTimestampSpy = jest.spyOn(require('@webex/cc-store'), 'setLastStateChangeTimestamp');
    const {result} = renderHook(() =>
      useStationLogin({
        cc: ccMock,
        onLogin: loginCb,
        onLogout: logoutCb,
        logger,
        isAgentLoggedIn,
        handleContinue: jest.fn(),
        showMultipleLoginAlert: false,
      })
    );

    act(() => {
      result.current.setDeviceType(loginParams.loginOption);
      result.current.setDialNumber(loginParams.dialNumber);
      result.current.setTeam(loginParams.teamId);
    });

    await act(async () => {
      await result.current.login();
    });

    await waitFor(async () => {
      expect(ccMock.stationLogin).toHaveBeenCalledWith({
        teamId: loginParams.teamId,
        loginOption: loginParams.loginOption,
        dialNumber: loginParams.dialNumber,
      });
      expect(loginCb).toHaveBeenCalledWith();

      expect(result.current).toEqual({
        name: 'StationLogin',
        isAgentLoggedIn: true,
        setDeviceType: expect.any(Function),
        setDialNumber: expect.any(Function),
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: successResponse,
        loginFailure: undefined,
        logoutSuccess: undefined,
        relogin: expect.any(Function),
        showMultipleLoginAlert: false,
        handleContinue: expect.any(Function),
      });

      expect(setSelectedLoginOptionSpy).toHaveBeenCalledWith(loginParams.loginOption);
      expect(setSetCurrentStateSpy).toHaveBeenCalledWith(successResponse.data.auxCodeId);
      expect(setSetLastStateChangeTimestampSpy).toHaveBeenCalledWith(
        new Date(successResponse.data.lastStateChangeTimestamp)
      );
    });
  });

  it('should not call setSelectedLoginOptionSpy if login fails', async () => {
    const errorResponse = new Error('Login failed');
    ccMock.stationLogin.mockRejectedValue(errorResponse);
    const setSelectedLoginOptionSpy = jest.spyOn(require('@webex/cc-store'), 'setSelectedLoginOption');

    loginCb.mockClear();
    const {result} = renderHook(() =>
      useStationLogin({
        cc: ccMock,
        onLogin: loginCb,
        onLogout: logoutCb,
        logger,
        isAgentLoggedIn,
        handleContinue: jest.fn(),
        showMultipleLoginAlert: false,
      })
    );

    act(() => {
      result.current.setDeviceType(loginParams.loginOption);
      result.current.setDialNumber(loginParams.dialNumber);
      result.current.setTeam(loginParams.teamId);
    });

    await act(async () => {
      await result.current.login();
    });

    await waitFor(() => {
      expect(ccMock.stationLogin).toHaveBeenCalledWith({
        teamId: loginParams.teamId,
        loginOption: loginParams.loginOption,
        dialNumber: loginParams.dialNumber,
      });
      expect(loginCb).not.toHaveBeenCalledWith();

      expect(result.current).toEqual({
        name: 'StationLogin',
        isAgentLoggedIn: false,
        setDeviceType: expect.any(Function),
        setDialNumber: expect.any(Function),
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: undefined,
        loginFailure: errorResponse,
        logoutSuccess: undefined,
        relogin: expect.any(Function),
        showMultipleLoginAlert: false,
        handleContinue: expect.any(Function),
      });

      expect(setSelectedLoginOptionSpy).not.toHaveBeenCalled();
    });
  });

  it('should not call login callback if not present', async () => {
    ccMock.stationLogin.mockResolvedValue({});

    const {result} = renderHook(() =>
      useStationLogin({
        cc: ccMock,
        onLogout: logoutCb,
        logger,
        isAgentLoggedIn,
        handleContinue: jest.fn(),
        showMultipleLoginAlert: false,
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
    const {result} = renderHook(() =>
      useStationLogin({
        cc: ccMock,
        onLogin: loginCb,
        onLogout: logoutCb,
        logger,
        isAgentLoggedIn,
        handleContinue: jest.fn(),
        showMultipleLoginAlert: false,
      })
    );

    act(() => {
      result.current.setDeviceType(loginParams.loginOption);
      result.current.setDialNumber(loginParams.dialNumber);
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
        isAgentLoggedIn: true,
        setDeviceType: expect.any(Function),
        setDialNumber: expect.any(Function),
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: undefined,
        loginFailure: errorResponse,
        logoutSuccess: undefined,
        relogin: expect.any(Function),
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
        cc: ccMock,
        onLogin: loginCb,
        onLogout: logoutCb,
        logger,
        isAgentLoggedIn,
        handleContinue: jest.fn(),
        showMultipleLoginAlert: false,
      })
    );

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(ccMock.stationLogout).toHaveBeenCalledWith({logoutReason: 'User requested logout'});
      expect(logoutCb).toHaveBeenCalledWith();

      expect(result.current).toEqual({
        name: 'StationLogin',
        isAgentLoggedIn: false,
        setDeviceType: expect.any(Function),
        setDialNumber: expect.any(Function),
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: undefined,
        loginFailure: undefined,
        logoutSuccess: successResponse,
        relogin: expect.any(Function),
        showMultipleLoginAlert: false,
        handleContinue: expect.any(Function),
      });
    });
  });

  it('should log error on logout failure', async () => {
    ccMock.stationLogout.mockRejectedValue(new Error('Logout failed'));

    const {result} = renderHook(() =>
      useStationLogin({
        cc: ccMock,
        onLogin: loginCb,
        onLogout: logoutCb,
        logger,
        isAgentLoggedIn,
        handleContinue: jest.fn(),
        showMultipleLoginAlert: false,
      })
    );

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith('Error logging out: Error: Logout failed', {
        module: 'widget-station-login#helper.ts',
        method: 'logout',
      });
    });
  });

  it('should not call logout callback if not present', async () => {
    ccMock.stationLogout.mockResolvedValue({});

    const {result} = renderHook(() =>
      useStationLogin({
        cc: ccMock,
        onLogin: loginCb,
        logger,
        isAgentLoggedIn,
        handleContinue: jest.fn(),
        showMultipleLoginAlert: false,
      })
    );

    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(logoutCb).not.toHaveBeenCalled();
    });
  });

  it('should call relogin and set device type', async () => {
    const setSelectedLoginOptionSpy = jest.spyOn(require('@webex/cc-store'), 'setSelectedLoginOption');

    const {result} = renderHook(() =>
      useStationLogin({
        cc: ccMock,
        onLogin: loginCb,
        onLogout: logoutCb,
        logger,
        isAgentLoggedIn,
        handleContinue: jest.fn(),
        showMultipleLoginAlert: false,
      })
    );

    act(() => {
      result.current.relogin();
    });

    await waitFor(() => {
      expect(setSelectedLoginOptionSpy).toHaveBeenCalled();
      expect(loginCb).toHaveBeenCalled();
    });
  });

  it('should handle AgentMultiLogin event', async () => {
    const {result} = renderHook(() =>
      useStationLogin({
        cc: ccMock,
        onLogin: loginCb,
        onLogout: logoutCb,
        logger,
        isAgentLoggedIn,
        handleContinue: jest.fn(),
        showMultipleLoginAlert: false,
      })
    );

    const event = new Event('AgentMultiLoginCloseSession');
    act(() => {
      ccMock.on.mock.calls[0][1](event);
    });

    await waitFor(() => {
      expect(result.current.showMultipleLoginAlert).toBe(true);
    });
  });
});
