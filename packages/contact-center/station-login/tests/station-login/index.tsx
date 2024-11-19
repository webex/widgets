import React from 'react';
import {render, screen} from '@testing-library/react';
import {StationLogin} from '../../src';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';

 // Sample login parameters
 const loginReqParam = {
  teamId: 'team123',
  loginOption: 'EXTENSION',
  dialNumber: '1001',
};
const teams = ['team123', 'team456'];

const loginOptions = ['EXTENSION', 'AGENT_DN', 'BROWSER'];

// Mock the store import
jest.mock('@webex/cc-store', () => {return {
  webex: {},
  teams,
  loginOptions,
  loginReqParam,
  setDeviceType: jest.fn(),
  setDialNumber: jest.fn(),
  setTeam: jest.fn()
}});

describe('StationLogin Component', () => {
  it('renders StationLoginPresentational with correct props', () => {
    const useStationLoginSpy = jest.spyOn(helper, 'useStationLogin');
    
    render(<StationLogin />);

    expect(useStationLoginSpy).toHaveBeenCalledWith({webex: {}, loginReqParam});
    const heading = screen.getByTestId('station-login-heading');
    expect(heading).toHaveTextContent('StationLogin');
  });
});