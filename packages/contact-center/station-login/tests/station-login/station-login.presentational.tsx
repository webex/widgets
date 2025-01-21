import React from 'react';
import {render, screen, cleanup} from '@testing-library/react';
import StationLoginPresentational from '../../src/station-login/station-login.presentational';
import '@testing-library/jest-dom';

describe('StationLoginPresentational', () => {
  afterEach(cleanup);
  
  const props = {
    name: 'StationLogin',
    login: jest.fn(),
    logout: jest.fn(),
    loginSuccess: undefined,
    loginFailure: undefined,
    logoutSuccess: undefined,
    teams: ['team123'],
    loginOptions: ['EXTENSION', 'AGENT_DN', 'BROWSER'],
    setDeviceType: jest.fn(),
    setDialNumber: jest.fn(),
    setTeam: jest.fn(),
    isAgentLoggedIn: false,
    deviceType: '',
  };

  it('renders the component name', () => {
    
    render(<StationLoginPresentational {...props} />);
    const heading = screen.getByTestId('station-login-heading');
    expect(heading).toHaveTextContent('StationLogin');
  });

  it('calls setDeviceType and relogin on relogin', () => {
    const setDeviceType = jest.fn();
    const reloginMock = jest.fn();
    const props = {
      name: 'StationLogin',
      login: jest.fn(),
      logout: jest.fn(),
      loginSuccess: undefined,
      loginFailure: undefined,
      logoutSuccess: undefined,
      teams: ['team123'],
      loginOptions: ['EXTENSION', 'AGENT_DN', 'BROWSER'],
      setDeviceType,
      setDialNumber: jest.fn(),
      setTeam: jest.fn(),
      isAgentLoggedIn: true,
      deviceType: 'EXTENSION',
      relogin: reloginMock,
    };
    render(<StationLoginPresentational {...props} />);

    expect(setDeviceType).toHaveBeenCalledWith('EXTENSION');
    expect(reloginMock).toHaveBeenCalled();
  });
});