import React from 'react';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import StationLoginPresentational from '../../src/station-login/station-login.presentational';
import '@testing-library/jest-dom';

describe('StationLoginPresentational', () => {
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
    showMultipleLoginAlert: false,
    handleContinue: jest.fn(),
    modalRef: React.createRef<HTMLDialogElement>(),
    relogin: jest.fn(),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component name', () => {
    render(<StationLoginPresentational {...props} />);
    const heading = screen.getByTestId('station-login-heading');
    expect(heading).toHaveTextContent('StationLogin');
  });

  it('calls setDeviceType and relogin on relogin', () => {
    const setDeviceType = jest.fn();
    const reloginMock = jest.fn();
    const handleContinueMock = jest.fn();
    const modalRef = React.createRef<HTMLDialogElement>();
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
      handleContinue: handleContinueMock,
      modalRef,
      showMultipleLoginAlert: false,
    };
    render(<StationLoginPresentational {...props} />);

    expect(setDeviceType).toHaveBeenCalledWith('EXTENSION');
    expect(reloginMock).toHaveBeenCalled();
  });

  it('calls handleContinue function and closes the dialog when Continue button is clicked', () => {
    const handleContinueMock = jest.fn();
    const modalRef = React.createRef<HTMLDialogElement>();
    HTMLDialogElement.prototype.showModal = jest.fn();
    HTMLDialogElement.prototype.close = jest.fn();

    const propsWithAlert = {
      ...props,
      showMultipleLoginAlert: true,
      handleContinue: handleContinueMock,
      modalRef,
    };
    render(<StationLoginPresentational {...propsWithAlert} />);
    const continueButton = screen.getByTestId('ContinueButton');
    fireEvent.click(continueButton);
    expect(handleContinueMock).toHaveBeenCalled();
  });
});
