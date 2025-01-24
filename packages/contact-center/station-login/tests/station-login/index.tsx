import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import StationLogin from '../../src/station-login';
import * as helper from '../../src/helper';
import '@testing-library/jest-dom';

const teams = ['team123', 'team456'];
const loginOptions = ['EXTENSION', 'AGENT_DN', 'BROWSER'];
const deviceType = 'BROWSER';

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
  };
});

const loginCb = jest.fn();
const logoutCb = jest.fn();

describe('StationLogin Component', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = jest.fn();
    HTMLDialogElement.prototype.close = jest.fn();
  });

  it('renders StationLoginPresentational with correct props', () => {
    const useStationLoginSpy = jest.spyOn(helper, 'useStationLogin').mockReturnValue({
      name: 'StationLogin',
      login: jest.fn(),
      logout: jest.fn(),
      loginSuccess: undefined,
      loginFailure: undefined,
      logoutSuccess: undefined,
      setDeviceType: jest.fn(),
      setDialNumber: jest.fn(),
      setTeam: jest.fn(),
      isAgentLoggedIn: false,
      cc: {
        on: jest.fn(),
        off: jest.fn(),
      },
      deviceType: 'BROWSER',
      handleContinue: jest.fn(),
      modalRef: React.createRef<HTMLDialogElement>(),
      showAlert: false,
      setShowAlert: jest.fn(),
      showMultipleLoginAlert: false,
      relogin: jest.fn(),
    });

    render(<StationLogin onLogin={loginCb} onLogout={logoutCb} />);

    expect(useStationLoginSpy).toHaveBeenCalledWith({
      cc: {
        on: expect.any(Function),
        off: expect.any(Function),
      },
      onLogin: loginCb,
      onLogout: logoutCb,
    });
    const heading = screen.getByTestId('station-login-heading');
    expect(heading).toHaveTextContent('StationLogin');
  });

  it('calls handleContinue and handles try-catch block', () => {
    const handleContinueMock = jest.fn();
    const setShowAlertMock = jest.fn();
    const modalRef = {current: {close: jest.fn()}};

    const useStationLoginSpy = jest.spyOn(helper, 'useStationLogin').mockReturnValue({
      name: 'StationLogin',
      login: jest.fn(),
      logout: jest.fn(),
      setDeviceType: jest.fn(),
      setDialNumber: jest.fn(),
      setTeam: jest.fn(),
      isAgentLoggedIn: true,
      cc: {
        on: jest.fn(),
        off: jest.fn(),
      },
      deviceType: 'BROWSER',
      handleContinue: handleContinueMock,
      modalRef,
      showAlert: true,
      setShowAlert: setShowAlertMock,
      showMultipleLoginAlert: true,
      relogin: jest.fn(),
    });

    render(<StationLogin onLogin={loginCb} onLogout={logoutCb} />);

    const continueButton = screen.getByTestId('ContinueButton');

    fireEvent.click(continueButton);

    expect(handleContinueMock).toHaveBeenCalled();
    expect(modalRef.current.close).toHaveBeenCalled();
    expect(setShowAlertMock).toHaveBeenCalledWith(false);

    // Simulate an error in handleContinue
    handleContinueMock.mockImplementation(() => {
      throw new Error('Test error');
    });

    try {
      fireEvent.click(continueButton);
    } catch (error) {
      expect(error).toEqual(new Error('Test error'));
    }
  });
});
