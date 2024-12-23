import {renderHook, act, waitFor} from '@testing-library/react';
import {useStationLogin} from '../src/helper';

const teams = ['team123', 'team456'];

const loginOptions = ['EXTENSION', 'AGENT_DN', 'BROWSER'];
jest.mock('@webex/cc-store', () => {
  return {
    cc: {},
    teams,
    loginOptions,
  };
});

// Mock webex instance
const ccMock = {
    stationLogin: jest.fn(),
    stationLogout: jest.fn(),
};

// Sample login parameters
const loginParams = {
  teamId: 'team123',
  loginOption: 'EXTENSION',
  dialNumber: '1001',
};

const loginCb = jest.fn();
const logoutCb = jest.fn();

describe('useStationLogin Hook', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should set loginSuccess on successful login', async () => {
    const successResponse = {
      agentId: "6b310dff-569e-4ac7-b064-70f834ea56d8",
      agentSessionId: "c9c24ace-5170-4a9f-8bc2-2eeeff9d7c11",
      auxCodeId: "00b4e8df-f7b0-460f-aacf-f1e635c87d4d",
      deviceId: "1001",
      deviceType: "EXTENSION",
      dn: "1001",
      eventType: "AgentDesktopMessage",
      interactionIds: [],
      lastIdleCodeChangeTimestamp: 1731997914706,
      lastStateChangeTimestamp: 1731997914706,
      orgId: "6ecef209-9a34-4ed1-a07a-7ddd1dbe925a",
      profileType: "BLENDED",
      roles: ['agent'],
      siteId: "d64e19c0-53a2-4ae0-ab7e-3ebc778b3dcd",
      status: "LoggedIn",
      subStatus: "Idle",
      teamId: "c789288e-39e3-40c9-8e66-62c6276f73de",
      trackingId: "f40915b9-07ed-4b6c-832d-e7f5e7af3b72",
      type: "AgentStationLoginSuccess",
      voiceCount: 1
    };

    ccMock.stationLogin.mockResolvedValue(successResponse);

    const { result } = renderHook(() =>
      useStationLogin({cc: ccMock, onLogin: loginCb, onLogout: logoutCb})
    );

    result.current.setDeviceType(loginParams.loginOption);
    result.current.setDialNumber(loginParams.dialNumber);
    result.current.setTeam(loginParams.teamId);

    act(() => {
      result.current.login();
    });

    waitFor(() => {
      expect(ccMock.stationLogin).toHaveBeenCalledWith({
        teamId: loginParams.teamId,
        loginOption: loginParams.loginOption,
        dialNumber: loginParams.dialNumber,
      });
      expect(loginCb).toHaveBeenCalledWith();
  
      expect(result.current).toEqual({
        name: 'StationLogin',
        setDeviceType: expect.any(Function),
        setDialNumber: expect.any(Function),
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: successResponse,
        loginFailure: undefined,
        logoutSuccess: undefined
      });
    });
  });

  it('should not call login callback if not present', async () => {

    ccMock.stationLogin.mockResolvedValue({});

    const { result } = renderHook(() =>
      useStationLogin({cc: ccMock, onLogout: logoutCb})
    );

    act(() => {
      result.current.login();
    });

    waitFor(() => {
      expect(loginCb).not.toHaveBeenCalled();
    });
  });

  it('should set loginFailure on failed login', async () => {
    const errorResponse = new Error('Login failed');
    ccMock.stationLogin.mockRejectedValue(errorResponse);

    loginCb.mockClear();
    const { result } = renderHook(() =>
      useStationLogin({cc: ccMock, onLogin: loginCb, onLogout: logoutCb})
    );

    result.current.setDeviceType(loginParams.loginOption);
    result.current.setDialNumber(loginParams.dialNumber);
    result.current.setTeam(loginParams.teamId);

    act(() => {
      result.current.login();
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
        setDeviceType: expect.any(Function),
        setDialNumber: expect.any(Function),
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: undefined,
        loginFailure: errorResponse,
        logoutSuccess: undefined
      });
    });
  });

  it('should set logoutSuccess on successful logout', async () => {
    const successResponse = {
      agentId: "6b310dff-569e-4ac7-b064-70f834ea56d8",
      agentSessionId: "701ba0dc-2075-4867-a753-226ad8e2197a",
      eventTime: 1731998475193,
      eventType: "AgentDesktopMessage",
      loggedOutBy: "SELF",
      logoutReason: "Agent Logged Out",
      orgId: "6ecef209-9a34-4ed1-a07a-7ddd1dbe925a",
      roles: ['agent'],
      status: "LoggedOut",
      subStatus: "Idle",
      trackingId: "77170ae4-fd8d-4bf5-bfaa-5f9d8975265c",
      type: "AgentLogoutSuccess"
    };

    ccMock.stationLogout.mockResolvedValue(successResponse);

    const {result} = renderHook(() =>
      useStationLogin({cc: ccMock, onLogin: loginCb, onLogout: logoutCb})
    );

    act(() => {
      result.current.logout();
    });

    waitFor(() => {
      expect(ccMock.stationLogout).toHaveBeenCalledWith({logoutReason: 'User requested logout'});
      expect(logoutCb).toHaveBeenCalledWith();


      expect(result.current).toEqual({
        name: 'StationLogin',
        setDeviceType: expect.any(Function),
        setDialNumber: expect.any(Function),
        setTeam: expect.any(Function),
        login: expect.any(Function),
        logout: expect.any(Function),
        loginSuccess: undefined,
        loginFailure: undefined,
        logoutSuccess: successResponse
      });
    });
  });

  it('should not call logout callback if not present', async () => {
    ccMock.stationLogout.mockResolvedValue({});

    const {result} = renderHook(() =>
      useStationLogin({cc: ccMock, onLogin: loginCb})
    );

    act(() => {
      result.current.logout();
    });

    waitFor(() => {
      expect(logoutCb).not.toHaveBeenCalled();
    });
  });
})
