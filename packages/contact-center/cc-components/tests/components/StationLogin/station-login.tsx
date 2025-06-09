import React from 'react';
import '@testing-library/jest-dom';
import {render, screen, fireEvent} from '@testing-library/react';
import StationLoginComponent from '../../../src/components/StationLogin/station-login';
import {StationLoginLabels, LoginOptions, SignInErrors} from '../../../src/components/StationLogin/constants';
import {StationLoginComponentProps} from 'packages/contact-center/cc-components/src/components/StationLogin/station-login.types';

describe.skip('Station Login Component', () => {
  const props: StationLoginComponentProps = {
    loginOptions: ['AGENT_DN', 'EXTENSION', 'BROWSER'],
    login: jest.fn(),
    logout: jest.fn(),
    loginSuccess: undefined,
    loginFailure: undefined,
    logoutSuccess: undefined,
    teams: [
      {id: 'team123', name: 'Team A'},
      {id: 'team456', name: 'Team B'},
    ],
    setDeviceType: jest.fn(),
    setDialNumber: jest.fn(),
    setTeam: jest.fn(),
    isAgentLoggedIn: false,
    handleContinue: jest.fn(),
    deviceType: 'EXTENSION',
    dialNumber: '',
    dialNumberRegex: '',
    showMultipleLoginAlert: false,
    onCCSignOut: jest.fn(),
    teamId: 'team123',
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

  describe('Rendering', () => {
    it('renders the component correctly', async () => {
      render(<StationLoginComponent {...props} />);

      expect(screen.getAllByTestId('station-login-label')[0]).toHaveTextContent(
        StationLoginLabels.INTERACTION_PREFERENCES
      );
      expect(screen.getAllByTestId('station-login-label')[1]).toHaveTextContent(StationLoginLabels.HANDLE_CALLS);
      expect(screen.getAllByTestId('station-login-icon')[0]);

      const tooltip = screen.getAllByTestId('station-login-tooltip')[0];
      expect(tooltip).toHaveAttribute('data-testid', 'station-login-tooltip');

      const tooltipText = tooltip.childNodes[0];
      expect(tooltipText).toHaveAttribute('data-testid', 'station-login-label');
      expect(tooltipText).toHaveClass('agent-login-popover');
      expect(tooltipText).toHaveTextContent(StationLoginLabels.HANDLE_CALLS_TOOLTIP);

      const loginOptionsSelect = screen.getAllByTestId('login-option-select')[0];
      expect(loginOptionsSelect).toHaveAttribute('data-testid', 'login-option-select');

      const loginOptions = loginOptionsSelect.childNodes;
      // Check how many loginOptions are rendered
      expect(loginOptions.length).toBe(props.loginOptions.length);

      props.loginOptions.forEach((option, idx) => {
        expect(loginOptions[idx]).toHaveTextContent(LoginOptions[option]);
        expect(loginOptions[idx]).toHaveValue(option);
      });

      const numberInput = screen.getByTestId('dial-number-input');
      expect(numberInput).toHaveAttribute('data-testid', 'dial-number-input');

      const teamsSelect = screen.getByTestId('teams-select-dropdown');
      expect(teamsSelect).toHaveAttribute('data-testid', 'teams-select-dropdown');
      expect(teamsSelect.childNodes).toHaveLength(props.teams.length);

      expect(screen.queryByTestId('station-login-failure-label')).not.toBeInTheDocument();
      expect(screen.getByTestId('login-button')).toHaveTextContent(StationLoginLabels.SAVE_AND_CONTINUE);
    });

    it('renders login failure when passed', () => {
      const errorMessage = 'DUPLICATE_LOCATION';
      render(<StationLoginComponent {...props} loginFailure={new Error(errorMessage)} />);
      expect(screen.getByTestId('station-login-failure-label')).toHaveTextContent(`${SignInErrors[errorMessage]}`);
    });
  });
  describe('Actions', () => {
    describe('Login buttons actions', () => {
      it('calls login function when Save and Continue button is clicked', () => {
        render(<StationLoginComponent {...props} />);
        const loginButton = screen.getByTestId('login-button');
        fireEvent.click(loginButton);
        expect(props.login).toHaveBeenCalled();
      });

      it('calls setDeviceType and updates state when a new login option is selected', () => {
        render(<StationLoginComponent {...props} />);
        const loginOptionSelect = screen.getByTestId('login-option-select');

        const event = new CustomEvent('change', {detail: {value: 'AGENT_DN'}});

        fireEvent(loginOptionSelect, event);
        expect(props.setDeviceType).toHaveBeenCalledWith('AGENT_DN');
      });
    });
    describe('SignOut Modal Popup', () => {
      it('show signOut modal when onCCSignOut is present and cancel is clicked', () => {
        const mockShowModal = jest.fn();
        if (typeof HTMLDialogElement !== 'undefined') {
          HTMLDialogElement.prototype.showModal = mockShowModal;
          HTMLDialogElement.prototype.close = jest.fn();
        }

        const mockSignOut = jest.fn();
        render(<StationLoginComponent {...props} isAgentLoggedIn={true} onCCSignOut={mockSignOut} />);

        // Click on the sign out button
        const signOutButton = screen.getByTestId('sign-out-button');
        expect(signOutButton).toBeInTheDocument();
        expect(signOutButton).toHaveTextContent(StationLoginLabels.SIGN_OUT);

        fireEvent.click(signOutButton);

        // Show the signout modal
        expect(mockShowModal).toHaveBeenCalled();

        // Check if the modal is rendered with correct content
        const signOutModal = screen.getByTestId('cc-logout-modal');
        expect(signOutModal).toBeInTheDocument();
        expect(signOutModal).toHaveTextContent(StationLoginLabels.CC_SIGN_OUT);
        expect(signOutModal).toHaveTextContent(StationLoginLabels.CC_SIGN_OUT_CONFIRM);
        expect(signOutModal).toHaveTextContent(StationLoginLabels.SIGN_OUT);
        expect(signOutModal).toHaveTextContent(StationLoginLabels.CANCEL);

        // Click on the sign out confirmation button
        const confirmSignOutButton = screen.getByTestId('cc-logout-button');
        expect(confirmSignOutButton).toBeInTheDocument();
        expect(confirmSignOutButton).toHaveTextContent(StationLoginLabels.SIGN_OUT);

        fireEvent.click(confirmSignOutButton);

        expect(mockSignOut).toHaveBeenCalled();
      });

      it('show signOut modal when onCCSignOut is present and sign out is clicked', async () => {
        jest.spyOn(React, 'useRef').mockImplementation(() => ({
          current: {
            open: true,
            showModal: jest.fn(),
            close: jest.fn(),
          },
        }));

        const mockSignOut = jest.fn();
        render(<StationLoginComponent {...props} isAgentLoggedIn={true} onCCSignOut={mockSignOut} />);

        // Click on the sign out button to open modal
        const signOutButton = screen.getByTestId('sign-out-button');
        fireEvent.click(signOutButton);

        // Click on the sign out cancel button
        const cancelButton = screen.getByTestId('cc-cancel-button');
        expect(cancelButton).toBeInTheDocument();
        expect(cancelButton).toHaveTextContent(StationLoginLabels.CANCEL);
        fireEvent.click(cancelButton);

        expect(mockSignOut).not.toHaveBeenCalled();
      });
      it('should open modal if showMultipleLoginAlert is true and modalRef is set', () => {
        render(<StationLoginComponent {...props} showMultipleLoginAlert={true} />);

        // @ts-expect-error getByRole is not accepting open as a valid option
        const modal = screen.getByRole('dialog', {open: ''});
        expect(modal).toHaveTextContent(StationLoginLabels.MULTIPLE_SIGN_IN_ALERT_TITLE);
        expect(modal).toBeInTheDocument();
      });
      it('should close modal and call handleContinue when continueClicked is triggered', () => {
        const handleContinue = jest.fn();
        render(<StationLoginComponent {...props} handleContinue={handleContinue} showMultipleLoginAlert={true} />);

        const continueBtn = screen.getByTestId('ContinueButton');
        fireEvent.click(continueBtn);
        expect(handleContinue).toHaveBeenCalled();
      });
      it('should close sign-out modal and update state on cancel button click', () => {
        render(<StationLoginComponent {...props} />);
        const cancelButton = screen.getByTestId('cc-cancel-button');
        fireEvent.click(cancelButton);
        const modal = screen.getByTestId('cc-logout-modal') as HTMLDialogElement;
        expect(modal.open).toBeFalsy();
      });
    });

    describe('Teams Dropdown', () => {
      it('shows correct selected team name', () => {
        const selectedTeamId = 'team123';
        render(<StationLoginComponent {...props} teamId={selectedTeamId} />);

        const selectedTeam = props.teams.find((team) => team.id === selectedTeamId);
        const teamsSelect = screen.getByTestId('teams-select-dropdown');
        expect(teamsSelect).toHaveTextContent(selectedTeam.name);
      });

      it('calls setTeam, setSelectedTeamId and setTeamId when team is changed', () => {
        render(<StationLoginComponent {...props} />);

        const teamsSelect = screen.getByTestId('teams-select-dropdown');
        const newTeamId = 'team456';

        const event = new CustomEvent('change', {
          detail: {
            value: newTeamId,
          },
        });

        fireEvent(teamsSelect, event);

        expect(props.setTeam).toHaveBeenCalledWith(newTeamId);
        expect(props.setTeamId).toHaveBeenCalledWith(newTeamId);
      });
    });
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

  it('logs login option change and label update', () => {
    render(<StationLoginComponent {...props} />);

    const teamsSelect = screen.getByTestId('teams-select-dropdown');
    const newTeamId = 'team456';

    const event = new CustomEvent('change', {
      detail: {
        value: newTeamId,
      },
    });

    fireEvent(teamsSelect, event);

    expect(props.setTeam).toHaveBeenCalledWith(newTeamId);
    expect(props.setTeamId).toHaveBeenCalledWith(newTeamId);
  });
});
