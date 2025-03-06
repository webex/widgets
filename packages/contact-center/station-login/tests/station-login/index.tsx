import React from 'react';
import {render} from '@testing-library/react';
import {StationLogin} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonPill: () => <div data-testid="ButtonPill" />,
}));

const teamsMock = ['team123', 'team456'];
const ccMock = {
  on: () => {},
  off: () => {},
};
const loginOptionsMock = ['EXTENSION', 'AGENT_DN', 'BROWSER'];
const deviceTypeMock = 'BROWSER';
const loggerMock = {};
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
    logger: loggerMock,
    isAgentLoggedIn: isAgentLoggedInMock,
    setCCCallback: jest.fn(),
    setLogoutCallback: jest.fn(),
    removeCCCallback: jest.fn(),
    CC_EVENTS: {
      AGENT_STATION_LOGIN_SUCCESS: 'AgentStationLoginSuccess',
    },
  };
});

const loginCb = jest.fn();
const logoutCb = jest.fn();

describe('StationLogin Component', () => {
  it('renders StationLoginPresentational with correct props', () => {
    const useStationLoginSpy = jest.spyOn(helper, 'useStationLogin');

    render(<StationLogin onLogin={loginCb} onLogout={logoutCb} />);

    expect(useStationLoginSpy).toHaveBeenCalledWith({
      cc: ccMock,
      onLogin: loginCb,
      onLogout: logoutCb,
      logger: loggerMock,
      deviceType: deviceTypeMock,
    });
  });
});
