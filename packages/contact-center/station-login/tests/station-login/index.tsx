import React from 'react';
import {render} from '@testing-library/react';
import {StationLogin} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';
import store from '@webex/cc-store';

const teamsMock = ['team123', 'team456'];
const ccMock = {
  on: () => {},
  off: () => {},
};
const loginOptionsMock = ['EXTENSION', 'AGENT_DN', 'BROWSER'];
const deviceTypeMock = 'BROWSER';
const dialNumberMock = '12345';
const dialNumberRegexMock = '1[0-9]{3}[2-9][0-9]{6}([,]{1,10}[0-9]+){0,1}';
const isAgentLoggedInMock = false;

// Mock the store import
jest.mock('@webex/cc-store', () => {
  const originalStore = jest.requireActual('@webex/cc-store'); // Get the actual implementation

  return {
    ...originalStore, // Spread the original properties
    cc: ccMock,
    teams: teamsMock,
    loginOptions: loginOptionsMock,
    deviceType: deviceTypeMock,
    dialNumber: dialNumberMock,
    dialNumberRegex: dialNumberRegexMock,
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    },
    isAgentLoggedIn: isAgentLoggedInMock,
    setCCCallback: jest.fn(),
    setLogoutCallback: jest.fn(),
    removeCCCallback: jest.fn(),
    CC_EVENTS: {
      AGENT_STATION_LOGIN_SUCCESS: 'AgentStationLoginSuccess',
    },
    onErrorCallback: jest.fn(),
  };
});

const loginCb = jest.fn();
const logoutCb = jest.fn();
const ccLogoutCb = jest.fn();
const onSaveStart = jest.fn();
const onSaveEnd = jest.fn();

describe('StationLogin Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders StationLoginPresentational with correct props', () => {
    const useStationLoginSpy = jest.spyOn(helper, 'useStationLogin');

    render(
      <StationLogin
        onLogin={loginCb}
        onLogout={logoutCb}
        onCCSignOut={ccLogoutCb}
        onSaveStart={onSaveStart}
        onSaveEnd={onSaveEnd}
        teamId="team123"
        profileMode={false}
      />
    );

    expect(useStationLoginSpy).toHaveBeenCalledWith({
      cc: ccMock,
      onLogin: loginCb,
      onLogout: logoutCb,
      logger: expect.any(Object),
      deviceType: deviceTypeMock,
      dialNumber: dialNumberMock,
      isAgentLoggedIn: false,
      onSaveEnd: onSaveEnd,
      onSaveStart: onSaveStart,
      teamId: undefined,
      onCCSignOut: ccLogoutCb,
      doStationLogout: undefined,
    });
  });

  describe('ErrorBoundary Tests', () => {
    const mockOnErrorCallback = jest.fn();
    store.onErrorCallback = mockOnErrorCallback;
    it('should render empty fragment when ErrorBoundary catches an error', () => {
      // Mock the StationLoginInternal to throw an error by overriding the helper
      jest.spyOn(helper, 'useStationLogin').mockImplementation(() => {
        throw new Error('Test error in useStationLogin');
      });

      const {container} = render(<StationLogin profileMode={false} />);

      // The fallback should render an empty fragment (no content)
      expect(container.firstChild).toBeNull();
      expect(store.onErrorCallback).toHaveBeenCalledWith('StationLogin', Error('Test error in useStationLogin'));
    });
  });
});
