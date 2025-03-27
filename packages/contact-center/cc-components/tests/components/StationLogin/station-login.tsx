import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import StationLoginPresentational from '../../src/station-login/station-login.presentational';
import '@testing-library/jest-dom';

jest.mock('@momentum-ui/react-collaboration', () => ({
  ButtonPill: () => <div data-testid="ButtonPill" />,
  Text: () => <div data-testid="Text" />,
  SelectNext: () => <div data-testid="SelectNext" />,
  TextInput: () => <div data-testid="TextInput" />,
}));

jest.mock('@momentum-design/components/dist/react', () => ({
  Avatar: () => <div data-testid="Avatar" />,
  Icon: () => <div data-testid="Icon" />,
}));

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
  };

  afterEach(() => {
    jest.clearAllMocks();
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
