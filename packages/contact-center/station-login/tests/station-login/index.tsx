import React from 'react';
import {render} from '@testing-library/react';
import {StationLogin} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';

const teamsMock = ['team123', 'team456'];
const ccMock = {
  on: () => {},
  off: () => {},
};
const loginOptionsMock = ['EXTENSION', 'AGENT_DN', 'BROWSER'];
const deviceTypeMock = 'BROWSER';
const dialNumberMock = '12345';
const dialNumberRegexMock = '1[0-9]{3}[2-9][0-9]{6}([,]{1,10}[0-9]+){0,1}';
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
    dialNumber: dialNumberMock,
    dialNumberRegex: dialNumberRegexMock,
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

jest.mock('@webex/cc-components', () => {
  return {
    StationLoginComponent: () => <div>StationLoginComponent</div>,
  };
});

const loginCb = jest.fn();
const logoutCb = jest.fn();
const ccLogoutCb = jest.fn();
const onSaveStart = jest.fn();
const onSaveEnd = jest.fn();

describe('StationLogin Component', () => {
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
      logger: loggerMock,
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
});
