import React from 'react';
import {render, screen} from '@testing-library/react';
import {StationLogin} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';

const teams = ['team123', 'team456'];

const loginOptions = ['EXTENSION', 'AGENT_DN', 'BROWSER'];
const deviceType = 'BROWSER';
const logger = {};

// Mock the store import
jest.mock('@webex/cc-store', () => {
  return {
    cc: {
      on: jest.fn(),
      off: jest.fn(),
    },
    teams,
    loginOptions,
    deviceType,
    logger,
    isAgentLoggedIn: false,
  };
});

const loginCb = jest.fn();
const logoutCb = jest.fn();

describe('StationLogin Component', () => {
  it('renders StationLoginPresentational with correct props', () => {
    const useStationLoginSpy = jest.spyOn(helper, 'useStationLogin');

    render(<StationLogin onLogin={loginCb} onLogout={logoutCb} />);

    expect(useStationLoginSpy).toHaveBeenCalledWith({
      cc: {
        on: expect.any(Function),
        off: expect.any(Function),
      },
      onLogin: loginCb,
      onLogout: logoutCb,
      logger,
      isAgentLoggedIn: false,
      deviceType: 'BROWSER',
    });
    const heading = screen.getByTestId('station-login-heading');
    expect(heading).toHaveTextContent('StationLogin');
  });
});
