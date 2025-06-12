import React from 'react';
import '@testing-library/jest-dom';
import {fireEvent, render} from '@testing-library/react';
import StationLoginComponent from '../../../src/components/StationLogin/station-login';
import {StationLoginLabels, LoginOptions, SignInErrors} from '../../../src/components/StationLogin/constants';
import {StationLoginComponentProps} from '../../../src/components/StationLogin/station-login.types';
import * as stationLoginUtils from '../../../src/components/StationLogin/station-login.utils';

describe('Station Login Component', () => {
  const loggerMock = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

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
    dialNumberRegex: '',
    showMultipleLoginAlert: false,
    onCCSignOut: jest.fn(),
    setTeamId: jest.fn(),
    setSelectedTeamId: jest.fn(),
    selectedTeamId: 'team123',
    logger: loggerMock,
    selectedDeviceType: 'EXTENSION',
    dialNumberValue: '',
    setDialNumberValue: jest.fn(),
    setSelectedDeviceType: jest.fn(),
    selectedOption: 'EXTENSION',
    setCurrentLoginOptions: jest.fn(),
    currentLoginOptions: {
      deviceType: 'EXTENSION',
      dialNumber: '',
      teamId: 'team123',
    },
    originalLoginOptions: {
      deviceType: 'EXTENSION',
      dialNumber: '',
      teamId: 'team123',
    },
    profileMode: false,
    isLoginOptionsChanged: false,
    saveLoginOptions: jest.fn(),
    saveError: undefined,
  };

  // Mock all utility functions
  const mockHandleLoginOptionChanged = jest.fn();
  const mockHandleDNInputChanged = jest.fn();
  const mockHandleTeamSelectChanged = jest.fn();
  const mockHandleModals = jest.fn();
  const mockContinueClicked = jest.fn();
  const mockCcCancelButtonClicked = jest.fn();
  const mockHandleSaveConfirm = jest.fn();
  const mockSaveConfirmCancelClicked = jest.fn();
  const mockCreateStationLoginRefs = jest.fn(() => ({
    multiSignInModalRef: {current: null},
    ccSignOutModalRef: {current: null},
    saveConfirmDialogRef: {current: null},
  }));
  const mockUpdateDialNumberLabel = jest.fn();

  beforeEach(() => {
    // Mock all utility functions
    jest.spyOn(stationLoginUtils, 'handleLoginOptionChanged').mockImplementation(mockHandleLoginOptionChanged);
    jest.spyOn(stationLoginUtils, 'handleDNInputChanged').mockImplementation(mockHandleDNInputChanged);
    jest.spyOn(stationLoginUtils, 'handleTeamSelectChanged').mockImplementation(mockHandleTeamSelectChanged);
    jest.spyOn(stationLoginUtils, 'handleModals').mockImplementation(mockHandleModals);
    jest.spyOn(stationLoginUtils, 'continueClicked').mockImplementation(mockContinueClicked);
    jest.spyOn(stationLoginUtils, 'ccCancelButtonClicked').mockImplementation(mockCcCancelButtonClicked);
    jest.spyOn(stationLoginUtils, 'handleSaveConfirm').mockImplementation(mockHandleSaveConfirm);
    jest.spyOn(stationLoginUtils, 'saveConfirmCancelClicked').mockImplementation(mockSaveConfirmCancelClicked);
    jest.spyOn(stationLoginUtils, 'createStationLoginRefs').mockImplementation(mockCreateStationLoginRefs);
    jest.spyOn(stationLoginUtils, 'updateDialNumberLabel').mockImplementation(mockUpdateDialNumberLabel);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders the dialogs correctly', async () => {
      const screen = await render(<StationLoginComponent {...props} />);
      jest.spyOn(stationLoginUtils, 'handleModals').mockImplementation(() => {
        return {
          multiSignInModalRef: {current: {open: false}},
          ccSignOutModalRef: {current: {open: false}},
          saveConfirmDialogRef: {current: {open: false}},
        };
      });

      const multiSignInModal = screen.getByTestId('multi-sign-in-modal');
      expect(multiSignInModal).toHaveAttribute('class', 'dialog-modal');
      expect(multiSignInModal).toHaveAttribute('data-testid', 'multi-sign-in-modal');

      expect(multiSignInModal).toHaveTextContent(StationLoginLabels.MULTIPLE_SIGN_IN_ALERT_TITLE);
      expect(multiSignInModal).toHaveTextContent(StationLoginLabels.MULTIPLE_SIGN_IN_ALERT_MESSAGE);
      expect(multiSignInModal).toBeInTheDocument();

      const multiSignInModalButtons = multiSignInModal.querySelectorAll('mdc-button');
      expect(multiSignInModalButtons).toHaveLength(1);
      expect(multiSignInModalButtons[0]).toHaveTextContent(StationLoginLabels.CONTINUE);

      const ccSignOutModal = screen.getByTestId('cc-logout-modal');
      expect(ccSignOutModal).toHaveAttribute('data-testid', 'cc-logout-modal');
      expect(ccSignOutModal).toHaveTextContent(StationLoginLabels.CC_SIGN_OUT);
      expect(ccSignOutModal).toHaveTextContent(StationLoginLabels.CC_SIGN_OUT_CONFIRM);
      expect(ccSignOutModal).toBeInTheDocument();

      // Check Text components in cc-logout-modal
      const ccSignOutModalTitle = ccSignOutModal.querySelector('mdc-text[tagname="h2"]');
      expect(ccSignOutModalTitle).toHaveAttribute('type', 'body-large-bold');
      expect(ccSignOutModalTitle).toHaveAttribute('class', 'modal-text');
      expect(ccSignOutModalTitle).toHaveTextContent(StationLoginLabels.CC_SIGN_OUT);

      const ccSignOutModalMessage = ccSignOutModal.querySelector('mdc-text[tagname="p"]');
      expect(ccSignOutModalMessage).toHaveAttribute('type', 'body-midsize-regular');
      expect(ccSignOutModalMessage).toHaveAttribute('class', 'modal-text');
      expect(ccSignOutModalMessage).toHaveTextContent(StationLoginLabels.CC_SIGN_OUT_CONFIRM);
      const ccSignOutModalButtons = ccSignOutModal.querySelectorAll('mdc-button');

      expect(ccSignOutModalButtons).toHaveLength(2);
      expect(ccSignOutModalButtons[0]).toHaveTextContent(StationLoginLabels.CANCEL);
      expect(ccSignOutModalButtons[0]).toHaveAttribute('data-testid', 'cc-cancel-button');
      expect(ccSignOutModalButtons[0]).toHaveAttribute('variant', 'secondary');
      expect(ccSignOutModalButtons[0]).toHaveAttribute('class', 'white-button');
      expect(ccSignOutModalButtons[1]).toHaveTextContent(StationLoginLabels.SIGN_OUT);
      expect(ccSignOutModalButtons[1]).toHaveAttribute('data-testid', 'cc-logout-button');

      const interactionConfirmDialog = screen.getByTestId('interaction-confirmation-dialog');
      expect(interactionConfirmDialog).toHaveAttribute('data-testid', 'interaction-confirmation-dialog');
      expect(interactionConfirmDialog).toHaveTextContent(
        StationLoginLabels.CONFIRM_INTERACTION_PREFERENCE_CHANGES_TITLE
      );
      expect(interactionConfirmDialog).toBeInTheDocument();

      // Check Text component in interaction-confirmation-dialog
      const interactionConfirmDialogTitle = interactionConfirmDialog.querySelector('mdc-text[tagname="h2"]');
      expect(interactionConfirmDialogTitle).toHaveAttribute('type', 'body-large-bold');
      expect(interactionConfirmDialogTitle).toHaveAttribute('class', 'modal-text');
      expect(interactionConfirmDialogTitle).toHaveTextContent(
        StationLoginLabels.CONFIRM_INTERACTION_PREFERENCE_CHANGES_TITLE
      );
      const interactionConfirmDialogButtons = interactionConfirmDialog.querySelectorAll('mdc-button');
      expect(interactionConfirmDialogButtons).toHaveLength(3);
      expect(interactionConfirmDialogButtons[0]).toHaveAttribute('class', 'cancelSaveLoginOptions');
      expect(interactionConfirmDialogButtons[0]).toHaveAttribute('size', '32');
      expect(interactionConfirmDialogButtons[0]).toHaveAttribute('variant', 'tertiary');
      expect(interactionConfirmDialogButtons[0]).toHaveAttribute('color', 'default');
      expect(interactionConfirmDialogButtons[0]).toHaveAttribute('prefix-icon', 'cancel-bold');
      expect(interactionConfirmDialogButtons[0]).toHaveAttribute('postfix-icon', '');
      expect(interactionConfirmDialogButtons[0]).toHaveAttribute('type', 'button');
      expect(interactionConfirmDialogButtons[0]).toHaveAttribute('role', 'button');
      expect(interactionConfirmDialogButtons[0]).toHaveAttribute('aria-label', 'Close');

      expect(interactionConfirmDialogButtons[1]).toHaveTextContent(StationLoginLabels.CANCEL);
      expect(interactionConfirmDialogButtons[1]).toHaveAttribute('variant', 'secondary');
      expect(interactionConfirmDialogButtons[1]).toHaveAttribute('size', '32');
      expect(interactionConfirmDialogButtons[1]).toHaveAttribute('class', 'white-button');

      expect(interactionConfirmDialogButtons[2]).toHaveTextContent(StationLoginLabels.CONFIRM);
      expect(interactionConfirmDialogButtons[2]).toHaveAttribute('size', '32');
    });

    it('renders the component correctly', async () => {
      const screen = await render(<StationLoginComponent {...props} />);
      const interactionPreferencesLabel = screen.getAllByTestId('station-login-label')[0];
      expect(interactionPreferencesLabel).toHaveTextContent(StationLoginLabels.INTERACTION_PREFERENCES);
      expect(interactionPreferencesLabel).toHaveAttribute('tagname', 'span');
      expect(interactionPreferencesLabel).toHaveAttribute('type', 'body-large-bold');

      const handleCallsLabel = screen.getAllByTestId('station-login-label')[1];
      expect(handleCallsLabel).toHaveTextContent(StationLoginLabels.HANDLE_CALLS);
      expect(handleCallsLabel).toHaveAttribute('type', 'body-midsize-regular');
      const icon = screen.getAllByTestId('station-login-icon')[0];
      expect(icon).toHaveAttribute('name', 'info-badge-filled');
      expect(icon).toHaveAttribute('id', 'agent-login-info-badge');

      const tooltip = screen.getAllByTestId('station-login-tooltip')[0];
      expect(tooltip).toHaveAttribute('data-testid', 'station-login-tooltip');
      expect(tooltip).toHaveAttribute('color', 'contrast');
      expect(tooltip).toHaveAttribute('id', 'agent-login-label-tooltip');
      expect(tooltip).toHaveAttribute('triggerID', 'agent-login-info-badge');

      const tooltipText = tooltip.childNodes[0];
      expect(tooltipText).toHaveAttribute('data-testid', 'station-login-label');
      expect(tooltipText).toHaveAttribute('tagname', 'div');
      expect(tooltipText).toHaveAttribute('type', 'body-large-regular');
      expect(tooltipText).toHaveClass('agent-login-popover');
      expect(tooltipText).toHaveTextContent(StationLoginLabels.HANDLE_CALLS_TOOLTIP);

      const loginOptionsSelect = screen.getAllByTestId('login-option-select')[0];
      expect(loginOptionsSelect).toHaveAttribute('data-testid', 'login-option-select');
      expect(loginOptionsSelect).toHaveAttribute('name', 'login-option');
      expect(loginOptionsSelect).toHaveAttribute('class', 'station-login-select');
      expect(loginOptionsSelect).toHaveAttribute('value', props.selectedDeviceType);

      const loginOptions = loginOptionsSelect.childNodes;
      // Check how many loginOptions are rendered
      expect(loginOptions.length).toBe(props.loginOptions.length);

      props.loginOptions.forEach((option, idx) => {
        expect(loginOptions[idx]).toHaveTextContent(LoginOptions[option]);
        expect(loginOptions[idx]).toHaveValue(option);
        if (option === 'EXTENSION') expect(loginOptions[idx]).toHaveAttribute('selected', '');
        expect(loginOptions[idx]).toHaveAttribute('data-testid', `login-option-${LoginOptions[option]}`);
      });

      const numberInput = screen.getByTestId('dial-number-input');
      expect(numberInput).toHaveAttribute('data-testid', 'dial-number-input');
      expect(numberInput).toHaveAttribute('value', props.dialNumberValue);

      const teamsSelect = screen.getByTestId('teams-select-dropdown');
      expect(teamsSelect).toHaveAttribute('data-testid', 'teams-select-dropdown');
      expect(teamsSelect).toHaveAttribute('name', 'teams-dropdown');
      expect(teamsSelect).toHaveAttribute('class', 'station-login-select');
      expect(teamsSelect).toHaveAttribute('label', StationLoginLabels.YOUR_TEAM);
      expect(teamsSelect.childNodes).toHaveLength(props.teams.length);

      // Check team options attributes
      const teamOptions = teamsSelect.childNodes;
      props.teams.forEach((team, idx) => {
        if (team.id === props.selectedTeamId) {
          expect(teamOptions[idx]).toHaveAttribute('selected', '');
        } else {
          expect(teamOptions[idx]).not.toHaveAttribute('selected');
        }
        expect(teamOptions[idx]).toHaveAttribute('value', team.id);
        expect(teamOptions[idx]).toHaveAttribute('data-testid', `teams-dropdown-${team.name}`);
        expect(teamOptions[idx]).toHaveTextContent(team.name);
      });

      expect(screen.queryByTestId('station-login-failure-label')).not.toBeInTheDocument();
      const loginButton = screen.getByTestId('login-button');
      expect(loginButton).toHaveTextContent(StationLoginLabels.SAVE_AND_CONTINUE);
      expect(loginButton).toHaveAttribute('data-testid', 'login-button');

      const signOutButton = screen.getByTestId('sign-out-button');
      expect(signOutButton).toHaveTextContent(StationLoginLabels.SIGN_OUT);
      expect(signOutButton).toHaveAttribute('data-testid', 'sign-out-button');
      expect(signOutButton).toHaveAttribute('variant', 'secondary');
      expect(signOutButton).toHaveAttribute('class', 'white-button');
    });

    it('renders the component correctly in profileMode', async () => {
      const screen = await render(<StationLoginComponent {...props} profileMode={true} isAgentLoggedIn={true} />);
      expect(screen.getAllByTestId('station-login-label')[0]).toHaveTextContent(StationLoginLabels.HANDLE_CALLS);
      expect(screen.getAllByTestId('station-login-icon')[0]);

      const tooltip = screen.getAllByTestId('station-login-tooltip')[0];
      expect(tooltip).toHaveAttribute('data-testid', 'station-login-tooltip');

      const tooltipText = tooltip.childNodes[0];
      expect(tooltipText).toHaveAttribute('data-testid', 'station-login-label');
      expect(tooltipText).toHaveClass('agent-login-popover');
      expect(tooltipText).toHaveTextContent(StationLoginLabels.HANDLE_CALLS_TOOLTIP);

      const loginOptionsSelect = screen.getAllByTestId('login-option-select')[0];
      expect(loginOptionsSelect).toHaveAttribute('data-testid', 'login-option-select');
      expect(loginOptionsSelect).toHaveAttribute('name', 'login-option');
      expect(loginOptionsSelect).toHaveAttribute('class', 'station-login-select');
      expect(loginOptionsSelect).toHaveAttribute('value', props.selectedDeviceType);

      const loginOptions = loginOptionsSelect.childNodes;
      // Check how many loginOptions are rendered
      expect(loginOptions.length).toBe(props.loginOptions.length);

      props.loginOptions.forEach((option, idx) => {
        expect(loginOptions[idx]).toHaveTextContent(LoginOptions[option]);
        expect(loginOptions[idx]).toHaveValue(option);
        expect(loginOptions[idx]).toHaveAttribute('data-testid', `login-option-${LoginOptions[option]}`);

        if (option === 'EXTENSION') {
          expect(loginOptions[idx]).toHaveAttribute('selected', '');
        }
      });

      const numberInput = screen.getByTestId('dial-number-input');
      expect(numberInput).toHaveAttribute('data-testid', 'dial-number-input');
      expect(numberInput).toHaveAttribute('value', '');

      const teamsSelect = screen.getByTestId('teams-select-dropdown');
      expect(teamsSelect).toHaveAttribute('data-testid', 'teams-select-dropdown');
      expect(teamsSelect).toHaveAttribute('name', 'teams-dropdown');
      expect(teamsSelect).toHaveAttribute('class', 'station-login-select');
      expect(teamsSelect).toHaveAttribute('label', StationLoginLabels.YOUR_TEAM);
      expect(teamsSelect.childNodes).toHaveLength(props.teams.length);

      // Check team options attributes
      const teamOptions = teamsSelect.childNodes;
      props.teams.forEach((team, idx) => {
        if (team.id === props.selectedTeamId) {
          expect(teamOptions[idx]).toHaveAttribute('selected', '');
        } else {
          expect(teamOptions[idx]).not.toHaveAttribute('selected');
        }
        expect(teamOptions[idx]).toHaveAttribute('value', team.id);
        expect(teamOptions[idx]).toHaveAttribute('data-testid', `teams-dropdown-${team.name}`);
        expect(teamOptions[idx]).toHaveTextContent(team.name);
      });

      expect(screen.queryByTestId('station-login-failure-label')).not.toBeInTheDocument();
      expect(screen.queryByTestId('login-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('sign-out-button')).not.toBeInTheDocument();
    });

    it('renders login failure when passed', async () => {
      const errorMessage = 'DUPLICATE_LOCATION';
      const screen = await render(<StationLoginComponent {...props} loginFailure={new Error(errorMessage)} />);
      const failureLabel = screen.getByTestId('station-login-failure-label');
      expect(failureLabel).toHaveTextContent(`${SignInErrors[errorMessage]}`);
      expect(failureLabel).toHaveAttribute('class', 'error-text-color');
      expect(failureLabel).toHaveAttribute('type', 'body-midsize-regular');
    });

    it('renders save error when passed', async () => {
      const errorMessage = 'Error in saving login options';
      const screen = await render(<StationLoginComponent {...props} saveError={errorMessage} />);
      const saveErrorElement = screen.getByTestId('save-error');
      expect(saveErrorElement).toBeInTheDocument();
      expect(saveErrorElement).toHaveTextContent(errorMessage);
      expect(saveErrorElement).toHaveAttribute('class', 'error-text-color');
      expect(saveErrorElement).toHaveAttribute('type', 'body-midsize-regular');
    });

    it('shows correct selected team name', async () => {
      const selectedTeamId = 'team123';
      const screen = await render(<StationLoginComponent {...props} />);

      const selectedTeam = props.teams.find((team) => team.id === selectedTeamId);
      const teamsSelect = screen.getByTestId('teams-select-dropdown');
      expect(teamsSelect).toHaveTextContent(selectedTeam.name);
    });

    it('renders save button when agent is logged in and in profile mode in interaction change menu', async () => {
      const screen = await render(<StationLoginComponent {...props} isAgentLoggedIn={true} profileMode={true} />);
      const saveButton = screen.getByTestId('save-login-options-button');
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toHaveAttribute('data-testid', 'save-login-options-button');
      expect(saveButton).toHaveAttribute('color', 'positive');
      expect(saveButton).toHaveTextContent(StationLoginLabels.SAVE);
    });
  });
  describe('Actions', () => {
    it('calls login function when Save and Continue button is clicked', async () => {
      const screen = await render(<StationLoginComponent {...props} />);
      const loginButton = screen.getByTestId('login-button');
      fireEvent.click(loginButton);
      expect(props.login).toHaveBeenCalled();
    });

    it('calls handleLoginOptionChanged utility function when a new login option is selected', async () => {
      const mockUpdateDialNumberLabel = jest.spyOn(stationLoginUtils, 'updateDialNumberLabel');
      const screen = await render(<StationLoginComponent {...props} />);
      const loginOptionSelect = screen.getByTestId('login-option-select');

      const event = new CustomEvent('change', {detail: {value: 'AGENT_DN'}});
      fireEvent(loginOptionSelect, event);

      expect(mockHandleLoginOptionChanged).toHaveBeenCalledWith(
        event,
        props.setDeviceType,
        props.setSelectedDeviceType,
        mockUpdateDialNumberLabel,
        props.setDialNumber,
        props.setDialNumberValue,
        props.setCurrentLoginOptions,
        props.originalLoginOptions,
        expect.any(Function), // setDialNumberLabel
        expect.any(Function), // setDialNumberPlaceholder
        expect.any(Function), // setShowDNError
        props.setSelectedTeamId,
        props.setTeamId,
        props.logger,
        props.selectedTeamId
      );
    });

    it('calls handleDNInputChanged with correct arguments when number is added', async () => {
      const mockhandleDNInputChanged = jest.spyOn(stationLoginUtils, 'handleDNInputChanged');
      const screen = await render(<StationLoginComponent {...props} />);
      const dialNumberInput = screen.getByTestId('dial-number-input');

      const event = new CustomEvent('input', {detail: {value: 'AGENT_DN'}});
      fireEvent(dialNumberInput, event);

      expect(mockhandleDNInputChanged).toHaveBeenCalledWith(
        event,
        props.setDialNumberValue,
        props.setDialNumber,
        expect.any(Function), // setShowDNError
        expect.any(Function), // setDNErrorText
        props.dialNumberRegex,
        props.setCurrentLoginOptions,
        props.selectedDeviceType,
        props.logger
      );
    });

    it('calls handleTeamSelectChanged utility function when team is changed', async () => {
      const screen = await render(<StationLoginComponent {...props} />);

      const teamsSelect = screen.getByTestId('teams-select-dropdown');

      expect(teamsSelect).toHaveAttribute('class', 'station-login-select');
      expect(teamsSelect).toHaveAttribute('data-testid', 'teams-select-dropdown');
      expect(teamsSelect).toHaveAttribute('name', 'teams-dropdown');
      expect(teamsSelect).toHaveAttribute('label', StationLoginLabels.YOUR_TEAM);

      const newTeamId = 'team456';

      const event = new CustomEvent('change', {
        detail: {
          value: newTeamId,
        },
      });

      fireEvent(teamsSelect, event);

      expect(mockHandleTeamSelectChanged).toHaveBeenCalledWith(
        event,
        props.setSelectedTeamId,
        props.setTeamId,
        props.setCurrentLoginOptions,
        props.setTeam,
        props.logger
      );
    });

    describe('SignOut Modal Popup', () => {
      it('show signOut modal when onCCSignOut is present and cancel is clicked', async () => {
        const mockSignOut = jest.fn();
        // Sign out button only renders when profileMode=false
        const screen = await render(
          <StationLoginComponent {...props} isAgentLoggedIn={true} onCCSignOut={mockSignOut} profileMode={false} />
        );

        // Click on the sign out button
        const signOutButton = screen.getByTestId('sign-out-button');
        expect(signOutButton).toBeInTheDocument();
        expect(signOutButton).toHaveTextContent(StationLoginLabels.SIGN_OUT);

        fireEvent.click(signOutButton);

        // Show the signout modal

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
        const screen = await render(
          <StationLoginComponent {...props} isAgentLoggedIn={true} onCCSignOut={mockSignOut} profileMode={false} />
        );

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

      it('should open modal if showMultipleLoginAlert is true and modalRef is set', async () => {
        const screen = await render(<StationLoginComponent {...props} showMultipleLoginAlert={true} />);

        const modal = screen.getAllByTestId('multi-sign-in-modal')[0];
        expect(modal).toHaveTextContent(StationLoginLabels.MULTIPLE_SIGN_IN_ALERT_TITLE);
        expect(modal).toBeInTheDocument();
      });

      it('should close modal and call continueClicked with correct arguments', async () => {
        const mockModal = {current: null};
        jest.spyOn(stationLoginUtils, 'createStationLoginRefs').mockImplementation(() => ({
          multiSignInModalRef: mockModal,
          ccSignOutModalRef: {current: null},
          saveConfirmDialogRef: {current: null},
        }));

        jest.spyOn(stationLoginUtils, 'continueClicked');
        const handleContinue = jest.fn();

        const screen = await render(
          <StationLoginComponent {...props} handleContinue={handleContinue} showMultipleLoginAlert={true} />
        );

        const continueBtn = screen.getByTestId('ContinueButton');
        fireEvent.click(continueBtn);
        expect(stationLoginUtils.continueClicked).toHaveBeenCalledWith(mockModal, handleContinue);
      });

      it('should close sign-out modal and update state on cancel button click', async () => {
        const screen = await render(<StationLoginComponent {...props} />);
        const cancelButton = screen.getByTestId('cc-cancel-button');
        fireEvent.click(cancelButton);
        const modal = screen.getByTestId('cc-logout-modal') as HTMLDialogElement;
        expect(modal.open).toBeFalsy();
      });
    });

    describe('ProfileMode interaction confirmation Popup', () => {
      it('it should call handleConfirmCancelClicked when clicked on cancel in popup', async () => {
        const mockRef = {current: null};
        jest.spyOn(stationLoginUtils, 'createStationLoginRefs').mockImplementation(() => ({
          multiSignInModalRef: {current: null},
          ccSignOutModalRef: {current: null},
          saveConfirmDialogRef: mockRef,
        }));

        const screen = await render(<StationLoginComponent {...props} isAgentLoggedIn={true} profileMode={true} />);
        const saveButton = screen.getByTestId('save-login-options-button');
        fireEvent.click(saveButton);

        const confirmationPopup = screen.getByTestId('interaction-confirmation-dialog');

        expect(confirmationPopup).toBeInTheDocument();
        const cancelButton = confirmationPopup.querySelectorAll('mdc-button')[0];

        fireEvent.click(cancelButton);
        expect(mockSaveConfirmCancelClicked).toHaveBeenCalledWith(mockRef, expect.any(Function));
      });

      it('it should call handleSaveConfirm when clicked on confirm in popup', async () => {
        const mockRef = {current: null};
        jest.spyOn(stationLoginUtils, 'createStationLoginRefs').mockImplementation(() => ({
          multiSignInModalRef: {current: null},
          ccSignOutModalRef: {current: null},
          saveConfirmDialogRef: mockRef,
        }));

        const screen = await render(<StationLoginComponent {...props} isAgentLoggedIn={true} profileMode={true} />);
        const saveButton = screen.getByTestId('save-login-options-button');
        fireEvent.click(saveButton);

        const confirmationPopup = screen.getByTestId('interaction-confirmation-dialog');

        expect(confirmationPopup).toBeInTheDocument();
        const confirmButton = confirmationPopup.querySelectorAll('mdc-button')[2];

        fireEvent.click(confirmButton);
        expect(mockHandleSaveConfirm).toHaveBeenCalledWith(mockRef, expect.any(Function), props.saveLoginOptions);
      });
    });
    describe('Save Login Options', () => {
      it('disables save button when no changes are made', async () => {
        const screen = await render(
          <StationLoginComponent {...props} isAgentLoggedIn={true} profileMode={true} isLoginOptionsChanged={false} />
        );
        const saveButton = screen.getByTestId('save-login-options-button');
        expect(saveButton).toBeInTheDocument();
        expect(saveButton).toHaveAttribute('disabled', '');
      });

      it('enables save button when changes are made', async () => {
        const screen = await render(
          <StationLoginComponent
            {...props}
            isAgentLoggedIn={true}
            profileMode={true}
            isLoginOptionsChanged={true}
            dialNumberValue="1234567890"
          />
        );
        const saveButton = screen.getByTestId('save-login-options-button');
        expect(saveButton).not.toHaveAttribute('disabled', '');
      });
    });
  });
});
