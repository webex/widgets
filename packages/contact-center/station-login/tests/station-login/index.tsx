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
  return {
    cc: ccMock,
    teams: teamsMock,
    loginOptions: loginOptionsMock,
    deviceType: deviceTypeMock,
    logger: loggerMock,
    isAgentLoggedIn: isAgentLoggedInMock,
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
