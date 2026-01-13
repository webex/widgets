import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlComponent from '../../../../src/components/task/CallControl/call-control';
import {CallControlComponentProps, CallControlMenuType, TARGET_TYPE} from '../../../../src/components/task/task.types';
import * as callControlUtils from '../../../../src/components/task/CallControl/call-control.utils';
import {mockTask} from '@webex/test-fixtures';

// Mock MediaStream for testing
Object.defineProperty(window, 'MediaStream', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    getTracks: jest.fn(() => []),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
  })),
});

describe('CallControlComponent', () => {
  const mockLogger = {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  };

  const mockCurrentTask = {
    ...mockTask,
    id: 'task-123',
    mediaType: 'telephony',
    status: 'connected',
    isHeld: false,
    recording: {isRecording: false},
    wrapUpReason: null,
  };

  const mockWrapupCodes = [
    {id: 'wrap1', name: 'Customer Issue', isSystem: false},
    {id: 'wrap2', name: 'Technical Support', isSystem: false},
  ];

  const mockBuddyAgents = [
    {
      agentId: 'agent1',
      id: 'agent1',
      firstName: 'John',
      lastName: 'Doe',
      agentName: 'John Doe',
      dn: '1001',
      teamId: 'team1',
      teamName: 'Support Team',
      siteId: 'site1',
      siteName: 'Main Site',
      profileId: 'profile1',
      agentSessionId: 'session1',
      state: 'Available',
      stateChangeTime: 1234567890,
      auxiliaryCodeId: null,
      teamIds: ['team1'],
    },
  ];

  const mockControlVisibility = {
    accept: {isVisible: true, isEnabled: true},
    decline: {isVisible: true, isEnabled: true},
    end: {isVisible: true, isEnabled: true},
    muteUnmute: {isVisible: true, isEnabled: true},
    muteUnmuteConsult: {isVisible: true, isEnabled: true},
    holdResume: {isVisible: true, isEnabled: true},
    consult: {isVisible: true, isEnabled: true},
    transfer: {isVisible: true, isEnabled: true},
    conference: {isVisible: true, isEnabled: true},
    wrapup: {isVisible: false, isEnabled: false}, // Set to false by default to show buttons
    pauseResumeRecording: {isVisible: true, isEnabled: true},
    endConsult: {isVisible: true, isEnabled: true},
    recordingIndicator: {isVisible: true, isEnabled: true},
    exitConference: {isVisible: false, isEnabled: false},
    mergeConference: {isVisible: false, isEnabled: false},
    mergeConferenceConsult: {isVisible: false, isEnabled: false},
    consultTransfer: {isVisible: false, isEnabled: false},
    consultTransferConsult: {isVisible: false, isEnabled: false},
    switchToMainCall: {isVisible: false, isEnabled: false},
    switchToConsult: {isVisible: false, isEnabled: false},
    isConferenceInProgress: false,
    isConsultInitiated: false,
    isConsultInitiatedAndAccepted: false,
    isConsultInitiatedOrAccepted: false,
    isConsultReceived: false,
    isHeld: false,
    consultCallHeld: false,
  };

  const defaultProps: CallControlComponentProps = {
    currentTask: mockCurrentTask,
    wrapupCodes: mockWrapupCodes,
    toggleHold: jest.fn(),
    toggleRecording: jest.fn(),
    toggleMute: jest.fn(),
    isMuted: false,
    endCall: jest.fn(),
    wrapupCall: jest.fn(),
    isRecording: false,
    setIsRecording: jest.fn(),
    buddyAgents: mockBuddyAgents,
    loadBuddyAgents: jest.fn(),
    loadingBuddyAgents: false,
    transferCall: jest.fn(),
    consultCall: jest.fn(),
    endConsultCall: jest.fn(),
    consultTransfer: jest.fn(),
    callControlAudio: null as unknown as MediaStream,
    consultAgentName: '',
    setConsultAgentName: jest.fn(),
    holdTime: 0,
    callControlClassName: '',
    callControlConsultClassName: '',
    startTimestamp: Date.now(),
    stateTimerLabel: null,
    stateTimerTimestamp: 0,
    consultTimerLabel: 'Consulting',
    consultTimerTimestamp: 0,
    allowConsultToQueue: true,
    lastTargetType: TARGET_TYPE.AGENT,
    setLastTargetType: jest.fn(),
    controlVisibility: mockControlVisibility,
    logger: mockLogger,
    secondsUntilAutoWrapup: null,
    cancelAutoWrapup: jest.fn(),
    exitConference: jest.fn(),
    consultConference: jest.fn(),
    switchToMainCall: jest.fn(),
    switchToConsult: jest.fn(),
    conferenceParticipants: [],
  };

  // Utility function spies
  let buildCallControlButtonsSpy: jest.SpyInstance;
  let getMediaTypeSpy: jest.SpyInstance;
  let isTelephonyMediaTypeSpy: jest.SpyInstance;
  let updateCallStateFromTaskSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock utility functions with proper return values
    getMediaTypeSpy = jest.spyOn(callControlUtils, 'getMediaType').mockReturnValue({
      labelName: 'Voice',
    });

    isTelephonyMediaTypeSpy = jest.spyOn(callControlUtils, 'isTelephonyMediaType').mockReturnValue(true);
    buildCallControlButtonsSpy = jest.spyOn(callControlUtils, 'buildCallControlButtons').mockReturnValue([
      {
        id: 'mute',
        icon: 'mute',
        onClick: jest.fn(),
        tooltip: 'Mute',
        className: 'mute-btn',
        disabled: false,
        isVisible: true,
      },
      {
        id: 'hold',
        icon: 'hold',
        onClick: jest.fn(),
        tooltip: 'Hold',
        className: 'hold-btn',
        disabled: false,
        isVisible: true,
      },
      {
        id: 'transfer',
        icon: 'next-bold',
        tooltip: 'Transfer',
        className: 'call-control-button',
        disabled: false,
        menuType: 'Transfer',
        isVisible: true,
      },
    ]);
    updateCallStateFromTaskSpy = jest.spyOn(callControlUtils, 'updateCallStateFromTask').mockImplementation(() => {});

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('Rendering', () => {
    it('renders mute and hold buttons and responds to user interactions', async () => {
      const modifiedProps = {
        ...defaultProps,
        isMuted: false,
        isHeld: false,
        controlVisibility: {
          ...mockControlVisibility,
          muteUnmute: true,
          holdResume: true,
        },
      };

      const screen = render(<CallControlComponent {...modifiedProps} />);

      // Perform user interactions
      const muteButton = screen.getByLabelText('Mute');
      fireEvent.click(muteButton);

      const holdButton = screen.getByLabelText('Hold');
      fireEvent.click(holdButton);

      // Verify mute button functionality
      expect(muteButton).toBeInTheDocument();
      expect(muteButton).toHaveAttribute('aria-label', 'Mute');
      expect(muteButton).toHaveAttribute('data-disabled', 'false');

      // Verify hold button functionality
      expect(holdButton).toBeInTheDocument();
      expect(holdButton).toHaveAttribute('aria-label', 'Hold');
      expect(holdButton).toHaveAttribute('data-disabled', 'false');
    });
    it('displays wrapup button when call is muted and held', async () => {
      const modifiedProps = {
        ...defaultProps,
        isMuted: true,
        controlVisibility: {
          ...mockControlVisibility,
          wrapup: {isVisible: true, isEnabled: true},
          isHeld: true,
        },
      };

      const screen = await render(<CallControlComponent {...modifiedProps} />);

      // Verify wrapup button is available when conditions are met
      const wrapupButton = screen.getByTestId('call-control:wrapup-button');
      expect(wrapupButton).toBeInTheDocument();
      expect(wrapupButton).toHaveAttribute('aria-expanded', 'false');
      expect(wrapupButton).toHaveAttribute('aria-haspopup', 'dialog');
      expect(wrapupButton).toHaveAttribute('type', 'button');
      expect(wrapupButton).toHaveTextContent('Wrap up');
    });
    it('renders all call control elements with proper attributes and accessibility features', async () => {
      const screen = await render(<CallControlComponent {...defaultProps} />);

      // Verify main container structure
      const callControlContainer = screen.getByTestId('call-control-container');
      expect(callControlContainer).toBeInTheDocument();
      expect(callControlContainer).toHaveAttribute('class', 'call-control-container');
      expect(callControlContainer).toHaveAttribute('data-testid', 'call-control-container');

      // Verify audio element for call playback
      const remoteAudio = screen.container.querySelector('#remote-audio');
      expect(remoteAudio).toBeInTheDocument();
      expect(remoteAudio).toHaveAttribute('autoplay', '');
      expect(remoteAudio).toHaveAttribute('id', 'remote-audio');

      // Verify button group container
      const buttonGroup = callControlContainer.querySelector('.button-group');
      expect(buttonGroup).toBeInTheDocument();
      expect(buttonGroup).toHaveAttribute('class', 'button-group');

      // Verify mute button and its properties
      const muteButton = screen.getByLabelText('Mute');
      expect(muteButton).toBeInTheDocument();
      expect(muteButton).toHaveAttribute('type', 'button');
      expect(muteButton).toHaveAttribute('aria-label', 'Mute');
      expect(muteButton).toHaveAttribute('class', 'md-button-circle-wrapper mute-btn md-button-simple-wrapper');
      expect(muteButton).toHaveAttribute('data-color', 'primary');
      expect(muteButton).toHaveAttribute('data-disabled', 'false');
      expect(muteButton).toHaveAttribute('data-size', '40');

      // Verify mute button icon
      const muteIcon = muteButton.querySelector('mdc-icon');
      expect(muteIcon).toBeInTheDocument();
      expect(muteIcon).toHaveAttribute('class', 'mute-btn-icon');
      expect(muteIcon).toHaveAttribute('name', 'mute');

      // Verify mute button tooltip
      const muteTooltip = screen.getByText('Mute').closest('.md-tooltip-label');
      expect(muteTooltip).toBeInTheDocument();
      expect(muteTooltip).toHaveAttribute('class', 'md-tooltip-label');

      // Verify hold button and its properties
      const holdButton = screen.getByLabelText('Hold');
      expect(holdButton).toBeInTheDocument();
      expect(holdButton).toHaveAttribute('type', 'button');
      expect(holdButton).toHaveAttribute('aria-label', 'Hold');
      expect(holdButton).toHaveAttribute('class', 'md-button-circle-wrapper hold-btn md-button-simple-wrapper');
      expect(holdButton).toHaveAttribute('data-color', 'primary');
      expect(holdButton).toHaveAttribute('data-disabled', 'false');
      expect(holdButton).toHaveAttribute('data-size', '40');

      // Verify hold button icon
      const holdIcon = holdButton.querySelector('mdc-icon');
      expect(holdIcon).toBeInTheDocument();
      expect(holdIcon).toHaveAttribute('class', 'hold-btn-icon');
      expect(holdIcon).toHaveAttribute('name', 'hold');

      // Verify hold button tooltip
      const holdTooltip = screen.getByText('Hold').closest('.md-tooltip-label');
      expect(holdTooltip).toBeInTheDocument();
      expect(holdTooltip).toHaveAttribute('class', 'md-tooltip-label');

      // Verify transfer button and its properties
      const transferButton = screen.getByLabelText('Transfer');
      expect(transferButton).toBeInTheDocument();
      expect(transferButton).toHaveAttribute('type', 'button');
      expect(transferButton).toHaveAttribute('aria-label', 'Transfer');
      expect(transferButton).toHaveAttribute('aria-expanded', 'false');
      expect(transferButton).toHaveAttribute('aria-haspopup', 'dialog');
      expect(transferButton).toHaveAttribute(
        'class',
        'md-button-circle-wrapper call-control-button md-button-simple-wrapper'
      );
      expect(transferButton).toHaveAttribute('data-color', 'primary');
      expect(transferButton).toHaveAttribute('data-disabled', 'false');
      expect(transferButton).toHaveAttribute('data-size', '40');

      // Verify transfer button icon
      const transferIcon = transferButton.querySelector('mdc-icon');
      expect(transferIcon).toBeInTheDocument();
      expect(transferIcon).toHaveAttribute('class', 'call-control-button-icon');
      expect(transferIcon).toHaveAttribute('name', 'next-bold');

      // Verify transfer button tooltip
      const transferTooltip = screen.getByText('Transfer').closest('.md-tooltip-label');
      expect(transferTooltip).toBeInTheDocument();
      expect(transferTooltip).toHaveAttribute('class', 'md-tooltip-label');

      // Verify utility functions were called
      expect(getMediaTypeSpy).toHaveBeenCalled();
      expect(isTelephonyMediaTypeSpy).toHaveBeenCalled();
      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
      expect(updateCallStateFromTaskSpy).toHaveBeenCalled();
    });
  });
  describe('Button interactions', () => {
    it('responds to hover events and maintains button state during interactions', async () => {
      // Use the default buildCallControlButtons to ensure mute and hold buttons are rendered
      const modifiedProps = {
        ...defaultProps,
        consultInitiated: false,
        controlVisibility: {
          ...mockControlVisibility,
          wrapup: false,
          consult: true,
          transfer: true,
          muteUnmute: true,
          holdResume: true,
        },
        buddyAgents: mockBuddyAgents,
      };

      const screen = await render(<CallControlComponent {...modifiedProps} />);

      // Test hover interactions on mute button
      const muteButton = screen.getByLabelText('Mute');
      fireEvent.mouseEnter(muteButton);
      fireEvent.mouseOver(muteButton);
      expect(muteButton).toBeInTheDocument();
      fireEvent.mouseLeave(muteButton);

      // Test hover interactions on hold button
      const holdButton = screen.getByLabelText('Hold');
      fireEvent.mouseEnter(holdButton);
      fireEvent.mouseOver(holdButton);
      expect(holdButton).toBeInTheDocument();
      fireEvent.mouseLeave(holdButton);

      // Test hover and click interactions on transfer button
      const transferButton = screen.getByLabelText('Transfer');

      // Verify accessibility attributes before interaction
      expect(transferButton).toHaveAttribute('aria-haspopup', 'dialog');
      expect(transferButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.mouseEnter(transferButton);
      fireEvent.mouseOver(transferButton);
      fireEvent.click(transferButton); // Trigger potential popover functionality
      fireEvent.mouseLeave(transferButton);

      // After clicking, the popover should be expanded
      expect(transferButton).toHaveAttribute('aria-expanded', 'true');

      // Verify buttons maintain their CSS classes after interactions
      expect(transferButton).toHaveClass('call-control-button');
      expect(muteButton).toHaveClass('mute-btn');
      expect(holdButton).toHaveClass('hold-btn');
    });
    it('handles various user interaction patterns on consultation buttons', async () => {
      const modifiedProps = {
        ...defaultProps,
        consultInitiated: false,
        controlVisibility: {
          ...mockControlVisibility,
          wrapup: false,
          consult: true,
        },
        buddyAgents: mockBuddyAgents,
      };

      // Mock filterButtonsForConsultation to return a consult button
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'consult',
          icon: 'consult',
          tooltip: 'Consult',
          className: 'call-control-button',
          disabled: false,
          menuType: 'Consult',
          isVisible: true,
          dataTestId: 'consult-button',
        },
      ]);

      const screen = await render(<CallControlComponent {...modifiedProps} />);

      // Locate consultation button for testing
      const consultButton = screen.getByLabelText('Consult');
      expect(consultButton).toBeInTheDocument();

      // Test keyboard interactions
      fireEvent.focus(consultButton);
      fireEvent.keyDown(consultButton, {key: 'Enter', code: 'Enter'});
      fireEvent.keyUp(consultButton, {key: 'Enter', code: 'Enter'});

      fireEvent.focus(consultButton);
      fireEvent.keyDown(consultButton, {key: ' ', code: 'Space'});
      fireEvent.keyUp(consultButton, {key: ' ', code: 'Space'});

      // Test mouse interactions
      fireEvent.mouseDown(consultButton);
      fireEvent.mouseUp(consultButton);
      fireEvent.click(consultButton);

      // Test touch interactions for mobile compatibility
      fireEvent.touchStart(consultButton);
      fireEvent.touchEnd(consultButton);

      // Verify button maintains accessibility and functionality
      expect(consultButton).toHaveAttribute('type', 'button');
      expect(consultButton).toHaveAttribute('aria-label', 'Consult');

      // Verify button parent structure exists
      const buttonParent = consultButton.parentElement;
      expect(buttonParent).toBeInTheDocument();
    });

    it('manages popover functionality for consultation and transfer operations', async () => {
      // Configure consultation button for popover testing
      const consultButton = {
        id: 'consult',
        icon: 'consult',
        tooltip: 'Consult',
        className: 'call-control-button',
        disabled: false,
        menuType: 'Consult' as CallControlMenuType,
        isVisible: true,
        dataTestId: 'consult-button',
        onClick: jest.fn(),
      };

      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([consultButton]);

      // Mock popover event handlers
      const mockHandleCloseButtonPress = jest.fn();

      jest.spyOn(callControlUtils, 'handleCloseButtonPress').mockImplementation(mockHandleCloseButtonPress);

      const modifiedProps = {
        ...defaultProps,
        consultInitiated: false,
        controlVisibility: {
          ...mockControlVisibility,
          wrapup: false,
          consult: true,
        },
        buddyAgents: mockBuddyAgents,
      };

      const screen = await render(<CallControlComponent {...modifiedProps} />);

      // Locate and interact with consultation button
      const consultButtonElement = screen.getByLabelText('Consult');
      expect(consultButtonElement).toBeInTheDocument();

      // Verify popover accessibility attributes before interaction
      expect(consultButtonElement).toHaveAttribute('aria-haspopup', 'dialog');
      expect(consultButtonElement).toHaveAttribute('aria-expanded', 'false');

      // Simulate user click to trigger popover functionality
      fireEvent.click(consultButtonElement);

      // After clicking, the popover should be expanded
      expect(consultButtonElement).toHaveAttribute('aria-expanded', 'true');

      // Test additional interactions that exercise popover behavior
      fireEvent.mouseEnter(consultButtonElement);
      fireEvent.focus(consultButtonElement);
      fireEvent.blur(consultButtonElement);
      fireEvent.mouseLeave(consultButtonElement);

      // Verify button integrity after interactions
      expect(consultButtonElement).toBeInTheDocument();
      expect(consultButtonElement).toHaveClass('call-control-button');
    });

    it('passes consultTransferOptions to popover and hides tabs accordingly', async () => {
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'consult',
          icon: 'consult',
          tooltip: 'Consult',
          className: 'call-control-button',
          disabled: false,
          menuType: 'Consult',
          isVisible: true,
          dataTestId: 'consult-button',
        },
      ]);

      const screen = await render(
        <CallControlComponent
          {...defaultProps}
          controlVisibility={{...mockControlVisibility, consult: true, transfer: false}}
          consultTransferOptions={{showDialNumberTab: false}}
        />
      );

      const consultButton = screen.getByLabelText('Consult');
      fireEvent.click(consultButton);

      await screen.findByRole('button', {name: 'Agents'});
      expect(screen.getByRole('button', {name: 'Queues'})).toBeInTheDocument();
      expect(screen.getByRole('button', {name: 'Entry Point'})).toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Dial Number'})).not.toBeInTheDocument();
    });

    it('hides Dial Number and Entry Point tabs for non-telephony media', async () => {
      jest.spyOn(callControlUtils, 'filterButtonsForConsultation').mockReturnValue([
        {
          id: 'consult',
          icon: 'consult',
          tooltip: 'Consult',
          className: 'call-control-button',
          disabled: false,
          menuType: 'Consult',
          isVisible: true,
          dataTestId: 'consult-button',
        },
      ]);

      isTelephonyMediaTypeSpy.mockReturnValue(false);

      const screen = await render(
        <CallControlComponent
          {...defaultProps}
          controlVisibility={{...mockControlVisibility, consult: true, transfer: false}}
        />
      );

      const consultButton = screen.getByLabelText('Consult');
      fireEvent.click(consultButton);

      await screen.findByRole('button', {name: 'Agents'});
      expect(screen.getByRole('button', {name: 'Queues'})).toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Dial Number'})).not.toBeInTheDocument();
      expect(screen.queryByRole('button', {name: 'Entry Point'})).not.toBeInTheDocument();
    });
  });
});
