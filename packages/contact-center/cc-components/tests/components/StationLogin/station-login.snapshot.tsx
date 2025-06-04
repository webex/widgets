import React from 'react';
import '@testing-library/jest-dom';
import {render, screen, fireEvent} from '@testing-library/react';
import StationLoginComponent from '../../../src/components/StationLogin/station-login';
import {StationLoginComponentProps} from 'packages/contact-center/cc-components/src/components/StationLogin/station-login.types';

// Mocks for required props
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
  setTeamId: jest.fn(),
  teamId: 'team123',
};

describe('StationLoginComponent Snapshot', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  describe('Rendering', () => {
    it('renders correctly and matches snapshot', () => {
      const {container} = render(<StationLoginComponent {...props} />);
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('renders correctly with agent logged in', () => {
      const loggedInProps = {...props, isAgentLoggedIn: true};
      const {container} = render(<StationLoginComponent {...loggedInProps} />);
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('renders correctly with showMultiLoginAlert', () => {
      const mockShowModal = jest.fn();
      if (typeof HTMLDialogElement !== 'undefined') {
        HTMLDialogElement.prototype.showModal = mockShowModal;
        HTMLDialogElement.prototype.close = jest.fn();
      }
      const multiLoginProps = {...props, showMultipleLoginAlert: true};
      const {container} = render(<StationLoginComponent {...multiLoginProps} />);
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });
    it('renders login failure when passed', () => {
      const errorMessage = 'DUPLICATE_LOCATION';
      const {container} = render(<StationLoginComponent {...props} loginFailure={new Error(errorMessage)} />);
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });
  });
  describe('Actions', () => {
    describe('Login buttons actions', () => {
      it('calls login function when Save and Continue button is clicked', () => {
        const {container} = render(<StationLoginComponent {...props} />);
        const loginButton = screen.getByTestId('login-button');
        fireEvent.click(loginButton);

        // Remove IDs to avoid snapshot issues with dynamic IDs
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
      });

      it('calls setDeviceType and updates state when a new login option is selected', () => {
        const {container} = render(<StationLoginComponent {...props} />);
        const loginOptionSelect = screen.getByTestId('login-option-select');

        const event = new CustomEvent('change', {detail: {value: 'AGENT_DN'}});

        fireEvent(loginOptionSelect, event);
        // Remove IDs to avoid snapshot issues with dynamic IDs
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
      });

      it('show signOut modal when onCCSignOut is present and cancel is clicked', () => {
        const mockShowModal = jest.fn();
        if (typeof HTMLDialogElement !== 'undefined') {
          HTMLDialogElement.prototype.showModal = mockShowModal;
          HTMLDialogElement.prototype.close = jest.fn();
        }

        const mockSignOut = jest.fn();
        const {container} = render(
          <StationLoginComponent {...props} isAgentLoggedIn={true} onCCSignOut={mockSignOut} />
        );

        const signOutButton = screen.getByTestId('sign-out-button');
        fireEvent.click(signOutButton);
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();

        const confirmSignOutButton = screen.getByTestId('cc-logout-button');
        fireEvent.click(confirmSignOutButton);
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
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
        const {container} = render(
          <StationLoginComponent {...props} isAgentLoggedIn={true} onCCSignOut={mockSignOut} />
        );

        // Click on the sign out button to open modal
        const signOutButton = screen.getByTestId('sign-out-button');
        fireEvent.click(signOutButton);
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();

        // Click on the sign out cancel button
        const cancelButton = screen.getByTestId('cc-cancel-button');
        fireEvent.click(cancelButton);
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
      });

      it('should open modal if showMultipleLoginAlert is true and modalRef is set', () => {
        const {container} = render(<StationLoginComponent {...props} showMultipleLoginAlert={true} />);

        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
      });

      it('should close modal and call handleContinue when continueClicked is triggered', () => {
        const handleContinue = jest.fn();
        const {container} = render(
          <StationLoginComponent {...props} handleContinue={handleContinue} showMultipleLoginAlert={true} />
        );

        const continueBtn = screen.getByTestId('ContinueButton');
        fireEvent.click(continueBtn);
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
        expect(handleContinue).toHaveBeenCalled();
      });

      it('should close sign-out modal and update state on cancel button click', () => {
        const {container} = render(<StationLoginComponent {...props} />);
        const cancelButton = screen.getByTestId('cc-cancel-button');
        fireEvent.click(cancelButton);
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
        const modal = screen.getByTestId('cc-logout-modal') as HTMLDialogElement;
        expect(modal.open).toBeFalsy();
      });
    });

    describe('Teams Dropdown', () => {
      it('shows correct selected team name', () => {
        const selectedTeamId = 'team123';
        const {container} = render(<StationLoginComponent {...props} teamId={selectedTeamId} />);

        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
      });

      it('calls setTeam, setSelectedTeamId and setTeamId when team is changed', () => {
        const {container} = render(<StationLoginComponent {...props} />);

        const teamsSelect = screen.getByTestId('teams-select-dropdown');
        const newTeamId = 'team456';

        const event = new CustomEvent('change', {
          detail: {
            value: newTeamId,
          },
        });

        fireEvent(teamsSelect, event);
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();

        expect(props.setTeam).toHaveBeenCalledWith(newTeamId);
        expect(props.setTeamId).toHaveBeenCalledWith(newTeamId);
      });
    });
  });
});
