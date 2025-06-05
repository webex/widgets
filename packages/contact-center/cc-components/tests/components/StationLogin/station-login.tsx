import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import StationLoginComponent from '../../../src/components/StationLogin/station-login';
import '@testing-library/jest-dom';

const loggerMock = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  trace: jest.fn(),
  error: jest.fn(),
};

describe('StationLoginComponent', () => {
  const props = {
    name: 'StationLogin',
    login: jest.fn(),
    logout: jest.fn(),
    loginSuccess: undefined,
    loginFailure: undefined,
    logoutSuccess: undefined,
    teams: [
      {id: 'team123', name: 'Team A'},
      {id: 'team456', name: 'Team B'},
    ],
    loginOptions: ['EXTENSION', 'AGENT_DN', 'BROWSER'],
    setDeviceType: jest.fn(),
    setDialNumber: jest.fn(),
    setTeam: jest.fn(),
    isAgentLoggedIn: false,
    deviceType: '',
    dialNumber: '',
    dialNumberRegex: '',
    showMultipleLoginAlert: false,
    handleContinue: jest.fn(),
    modalRef: React.createRef<HTMLDialogElement>(),
    onCCSignOut: jest.fn(),
    teamId: '',
    setTeamId: jest.fn(),
    setSelectedTeamId: jest.fn(),
    selectedTeamId: 'team123',
    logger: loggerMock,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('logs isAgentLoggedIn change on mount', () => {
    render(<StationLoginComponent {...props} />);
    expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: StationLogin: isAgentLoggedIn changed: false');
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
    render(<StationLoginComponent {...propsWithAlert} />);
    const continueButton = screen.getByTestId('ContinueButton');
    fireEvent.click(continueButton);
    expect(handleContinueMock).toHaveBeenCalled();
  });

  it('renders team dropdown with correct options', () => {
    render(<StationLoginComponent {...props} />);
    const teamSelect = screen.getByTestId('teams-dropdown-select');
    expect(teamSelect).toBeInTheDocument();
    expect(teamSelect.textContent).toContain('Team A');
    expect(teamSelect.textContent).toContain('Team B');
  });

  it('calls setTeam and setTeamId when a team is selected', async () => {
    render(<StationLoginComponent {...props} />);

    // Step 1: Open dropdown
    const dropdownButton = screen.getByTestId('teams-dropdown-select');
    fireEvent.click(dropdownButton);

    // Step 2: Click the option with text "Team B"
    const teamOption = await screen.findByText('Team B');
    fireEvent.click(teamOption);

    expect(props.setTeam).toHaveBeenCalledWith('team456');
    expect(props.setTeamId).toHaveBeenCalledWith('team456');
  });

  it('calls login on Save and Continue button click', () => {
    render(<StationLoginComponent {...props} />);
    const loginButton = screen.getByTestId('login-button');
    fireEvent.click(loginButton);
    expect(props.login).toHaveBeenCalled();
  });

  it('renders the select with correct selected option based on selectedTeamId', () => {
    render(<StationLoginComponent {...props} />);

    const selectedText = screen.getByText('Team A');
    expect(selectedText).toBeInTheDocument();
  });

  it('logs login option change and label update', () => {
    render(<StationLoginComponent {...props} />);
    const loginSelect = screen.getByTestId('login-option-select');
    fireEvent(loginSelect, new CustomEvent('change', {detail: {value: 'EXTENSION'}}));
    expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: StationLogin: login option changed to: EXTENSION', {
      module: 'cc-components#station-login.tsx',
      method: 'loginOptionChanged',
    });
    expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: StationLogin: updateDialNumberLabel: EXTENSION', {
      module: 'cc-components#station-login.tsx',
      method: 'updateDialNumberLabel',
    });
  });

  it('logs team selection', () => {
    render(<StationLoginComponent {...props} />);
    const teamSelect = screen.getByTestId('teams-dropdown-select');
    fireEvent(teamSelect, new CustomEvent('change', {detail: {value: 'team456'}}));
    expect(loggerMock.log).toHaveBeenCalledWith('CC-Widgets: StationLogin: team selected: team456', {
      module: 'cc-components#station-login.tsx',
      method: 'teamSelected',
    });
  });
});
