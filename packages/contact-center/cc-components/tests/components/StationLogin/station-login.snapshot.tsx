import React from 'react';
import '@testing-library/jest-dom';
import {render, screen, fireEvent} from '@testing-library/react';
import StationLoginComponent from '../../../src/components/StationLogin/station-login';
import {StationLoginComponentProps} from 'packages/contact-center/cc-components/src/components/StationLogin/station-login.types';
import * as stationLoginUtils from '../../../src/components/StationLogin/station-login.utils';

describe('Station Login Component', () => {
  const loggerMock = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };

  const mockTeams = [
    {
      id: 'team123',
      name: 'Team A',
      teamType: 'AGENT_BASED',
      teamStatus: 'ACTIVE',
      active: true,
      siteId: 'site123',
      siteName: 'Test Site A',
      multiMediaProfileId: 'profile123',
      userIds: ['user1', 'user2'],
      rankQueuesForTeam: false,
      queueRankings: [],
      dbId: 'db123',
      desktopLayoutId: 'layout123',
    },
    {
      id: 'team456',
      name: 'Team B',
      teamType: 'AGENT_BASED',
      teamStatus: 'ACTIVE',
      active: true,
      siteId: 'site456',
      siteName: 'Test Site B',
      multiMediaProfileId: 'profile456',
      userIds: ['user3', 'user4'],
      rankQueuesForTeam: true,
      queueRankings: ['queue1', 'queue2'],
      dbId: 'db456',
      desktopLayoutId: 'layout456',
    },
  ];

  const props: StationLoginComponentProps = {
    loginOptions: ['AGENT_DN', 'EXTENSION', 'BROWSER'],
    login: jest.fn(),
    logout: jest.fn(),
    loginSuccess: undefined,
    loginFailure: undefined,
    logoutSuccess: undefined,
    teams: mockTeams,
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
    it('renders the component correctly', async () => {
      const {container} = await render(<StationLoginComponent {...props} />);
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('renders the component correctly in profileMode', async () => {
      const {container} = await render(<StationLoginComponent {...props} profileMode={true} isAgentLoggedIn={true} />);
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('renders login failure when passed', async () => {
      const errorMessage = 'DUPLICATE_LOCATION';
      const {container} = await render(<StationLoginComponent {...props} loginFailure={new Error(errorMessage)} />);
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('renders save error when passed', async () => {
      const errorMessage = 'Error in saving login options';
      const {container} = await render(<StationLoginComponent {...props} saveError={errorMessage} />);
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('does not render loginOptions if not in LoginOptions constant i.e only render ext,desktop and dn', async () => {
      const {container} = await render(
        <StationLoginComponent {...props} loginOptions={['randomLoginOption1', 'randomLoginOption2', 'AGENT_DN']} />
      );
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('hides Desktop login option when hideDesktopLogin is true', async () => {
      const {container} = await render(
        <StationLoginComponent
          {...props}
          loginOptions={['AGENT_DN', 'EXTENSION', 'BROWSER']}
          hideDesktopLogin={true}
          profileMode={false}
        />
      );
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('shows Desktop login option when hideDesktopLogin is false', async () => {
      const {container} = await render(
        <StationLoginComponent
          {...props}
          loginOptions={['AGENT_DN', 'EXTENSION', 'BROWSER']}
          hideDesktopLogin={false}
          profileMode={false}
        />
      );
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('shows Desktop login option when hideDesktopLogin is undefined', async () => {
      const {container} = await render(
        <StationLoginComponent
          {...props}
          loginOptions={['AGENT_DN', 'EXTENSION', 'BROWSER']}
          hideDesktopLogin={undefined}
          profileMode={false}
        />
      );
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('hides Desktop login option in profile mode when hideDesktopLogin is true', async () => {
      const {container} = await render(
        <StationLoginComponent
          {...props}
          loginOptions={['AGENT_DN', 'EXTENSION', 'BROWSER']}
          hideDesktopLogin={true}
          profileMode={true}
          isAgentLoggedIn={true}
        />
      );
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });
  });

  describe('Actions', () => {
    it('calls handleDNInputChanged with correct arguments when number is added', async () => {
      const {container} = await render(<StationLoginComponent {...props} />);
      const dialNumberInput = screen.getByTestId('dial-number-input');

      const event = new CustomEvent('input', {detail: {value: 'AGENT_DN'}});
      fireEvent(dialNumberInput, event);

      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    it('calls handleTeamSelectChanged utility function when team is changed', async () => {
      const {container} = await render(<StationLoginComponent {...props} />);

      const teamsSelect = screen.getByTestId('teams-select-dropdown');
      expect(teamsSelect).toHaveAttribute('class', 'station-login-select');
      const newTeamId = 'team456';

      const event = new CustomEvent('change', {
        detail: {
          value: newTeamId,
        },
      });

      fireEvent(teamsSelect, event);
      // Remove IDs to avoid snapshot issues with dynamic IDs
      container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
      expect(container).toMatchSnapshot();
    });

    describe('SignOut Modal Popup', () => {
      it('show signOut modal when onCCSignOut is present and cancel is clicked', async () => {
        const mockSignOut = jest.fn();
        const {container} = await render(
          <StationLoginComponent {...props} isAgentLoggedIn={true} onCCSignOut={mockSignOut} profileMode={false} />
        );
        const signOutButton = screen.getByTestId('sign-out-button');
        fireEvent.click(signOutButton);

        // Remove IDs to avoid snapshot issues with dynamic IDs
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();

        // Click on the sign out confirmation button
        const confirmSignOutButton = screen.getByTestId('cc-logout-button');
        fireEvent.click(confirmSignOutButton);

        // Remove IDs to avoid snapshot issues with dynamic IDs
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
        const {container} = await render(
          <StationLoginComponent {...props} isAgentLoggedIn={true} onCCSignOut={mockSignOut} profileMode={false} />
        );

        // Click on the sign out button to open modal
        const signOutButton = screen.getByTestId('sign-out-button');
        fireEvent.click(signOutButton);

        // Remove IDs to avoid snapshot issues with dynamic IDs
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();

        // Click on the sign out cancel button
        const cancelButton = screen.getByTestId('cc-cancel-button');
        fireEvent.click(cancelButton);

        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
      });

      it('should close modal and call continueClicked with correct arguments', async () => {
        const handleContinue = jest.fn();
        const {container} = await render(
          <StationLoginComponent {...props} handleContinue={handleContinue} showMultipleLoginAlert={true} />
        );

        const continueBtn = screen.getByTestId('ContinueButton');
        fireEvent.click(continueBtn);

        // Remove IDs to avoid snapshot issues with dynamic IDs
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
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

        const {container} = await render(
          <StationLoginComponent {...props} isAgentLoggedIn={true} profileMode={true} />
        );
        const saveButton = screen.getByTestId('save-login-options-button');
        fireEvent.click(saveButton);

        // Remove IDs to avoid snapshot issues with dynamic IDs
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();

        const confirmationPopup = screen.getByTestId('interaction-confirmation-dialog');
        expect(confirmationPopup).toBeInTheDocument();
        const cancelButton = confirmationPopup.querySelectorAll('mdc-button')[0];
        fireEvent.click(cancelButton);

        // Remove IDs to avoid snapshot issues with dynamic IDs
        container.querySelectorAll('[id^="mdc-input"]').forEach((el) => el.removeAttribute('id'));
        expect(container).toMatchSnapshot();
      });
    });
  });
});
