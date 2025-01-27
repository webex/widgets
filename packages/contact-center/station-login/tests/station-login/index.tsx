import React from 'react';
import {render, screen} from '@testing-library/react';
import {StationLogin} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';

const teams = ['team123', 'team456'];

const loginOptions = ['EXTENSION', 'AGENT_DN', 'BROWSER'];
const deviceType = 'BROWSER';

// Mock the store import
jest.mock('@webex/cc-store', () => {return {
  cc: {},
  teams,
  loginOptions,
  deviceType,
}});

const loginCb = jest.fn();
const logoutCb = jest.fn();

describe('StationLogin Component', () => {
  it('renders StationLoginPresentational with correct props', () => {
    const useStationLoginSpy = jest.spyOn(helper, 'useStationLogin');
    
    render(<StationLogin onLogin={loginCb} onLogout={logoutCb}/>);

    expect(useStationLoginSpy).toHaveBeenCalledWith({cc: {}, onLogin: loginCb, onLogout: logoutCb});
    const heading = screen.getByTestId('station-login-heading');
    expect(heading).toHaveTextContent('StationLogin');
  });
});