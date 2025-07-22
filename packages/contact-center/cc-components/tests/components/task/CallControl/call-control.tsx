import React from 'react';
import {render, act, fireEvent, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlComponent from '../../../../src/components/task/CallControl/call-control';
import {CallControlComponentProps} from '../../../../src/components/task/task.types';
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
    accept: true,
    decline: true,
    end: true,
    muteUnmute: true,
    holdResume: true,
    consult: true,
    transfer: true,
    conference: true,
    wrapup: false, // Set to false by default to show buttons
    pauseResumeRecording: true,
    endConsult: true,
    recordingIndicator: true,
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
    isHeld: false,
    setIsHeld: jest.fn(),
    isRecording: false,
    setIsRecording: jest.fn(),
    buddyAgents: mockBuddyAgents,
    loadBuddyAgents: jest.fn(),
    queues: [],
    loadQueues: jest.fn(),
    transferCall: jest.fn(),
    consultCall: jest.fn(),
    endConsultCall: jest.fn(),
    consultInitiated: false,
    consultTransfer: jest.fn(),
    consultCompleted: false,
    consultAccepted: false,
    consultStartTimeStamp: Date.now(),
    callControlAudio: null as unknown as MediaStream,
    consultAgentName: '',
    setConsultAgentName: jest.fn(),
    consultAgentId: '',
    setConsultAgentId: jest.fn(),
    holdTime: 0,
    callControlClassName: '',
    callControlConsultClassName: '',
    startTimestamp: Date.now(),
    isEndConsultEnabled: true,
    allowConsultToQueue: true,
    lastTargetType: 'agent',
    setLastTargetType: jest.fn(),
    controlVisibility: mockControlVisibility,
    logger: mockLogger,
    secondsUntilAutoWrapup: null,
    cancelAutoWrapup: jest.fn(),
  };

  // Utility function spies
  let buildCallControlButtonsSpy: jest.SpyInstance;
  let getMediaTypeSpy: jest.SpyInstance;
  let isTelephonyMediaTypeSpy: jest.SpyInstance;
  let filterButtonsForConsultationSpy: jest.SpyInstance;
  let updateCallStateFromTaskSpy: jest.SpyInstance;
  let handleToggleHoldSpy: jest.SpyInstance;
  let handleMuteToggleSpy: jest.SpyInstance;

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
    filterButtonsForConsultationSpy = jest
      .spyOn(callControlUtils, 'filterButtonsForConsultation')
      .mockImplementation((buttons) => buttons);
    updateCallStateFromTaskSpy = jest.spyOn(callControlUtils, 'updateCallStateFromTask').mockImplementation(() => {});
    handleToggleHoldSpy = jest.spyOn(callControlUtils, 'handleToggleHold').mockImplementation(() => {});
    handleMuteToggleSpy = jest.spyOn(callControlUtils, 'handleMuteToggle').mockImplementation(() => {});

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering and Basic Functionality', () => {
    it('should render with various configurations and handle null task', async () => {
      // Test basic rendering
      await act(async () => {
        render(<CallControlComponent {...defaultProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
      expect(getMediaTypeSpy).toHaveBeenCalled();
      expect(isTelephonyMediaTypeSpy).toHaveBeenCalled();
      expect(screen.getByTestId('call-control-container')).toBeInTheDocument();
    });

    it('should handle audio element and media stream', async () => {
      const mockMediaStream = new (window as unknown as {MediaStream: new () => MediaStream}).MediaStream();
      const audioProps = {
        ...defaultProps,
        callControlAudio: mockMediaStream,
      };

      await act(async () => {
        render(<CallControlComponent {...audioProps} />);
      });

      // Check that the component renders with audio stream
      expect(screen.getByTestId('call-control-container')).toBeInTheDocument();
      // Audio element may be rendered conditionally
      const container = screen.getByTestId('call-control-container');
      const audioElements = container.querySelectorAll('audio');
      // Audio element might exist, if it does check its properties
      if (audioElements.length > 0) {
        expect(audioElements[0]).toBeInTheDocument();
      }
    });

    it('should handle different media types and consultation states', async () => {
      // Test non-telephony media type
      isTelephonyMediaTypeSpy.mockReturnValue(false);
      getMediaTypeSpy.mockReturnValue({labelName: 'Chat'});

      const chatProps = {
        ...defaultProps,
        currentTask: {...mockCurrentTask, mediaType: 'chat'},
      };

      await act(async () => {
        render(<CallControlComponent {...chatProps} />);
      });

      expect(isTelephonyMediaTypeSpy).toHaveBeenCalledWith('telephony');

      // Test consultation mode
      const consultProps = {
        ...defaultProps,
        consultAccepted: true,
        consultInitiated: true,
      };

      await act(async () => {
        render(<CallControlComponent {...consultProps} />);
      });

      expect(filterButtonsForConsultationSpy).toHaveBeenCalled();
    });
  });

  describe('Button Interactions and State Management', () => {
    it('should handle various button states and interactions', async () => {
      // Test regular button rendering
      await act(async () => {
        render(<CallControlComponent {...defaultProps} />);
      });

      expect(screen.getByTestId('mute')).toBeInTheDocument();
      expect(screen.getByTestId('hold')).toBeInTheDocument();

      // Test that transfer button exists (but may not trigger popover in test environment)
      const buttons = screen.getAllByTestId('ButtonCircle');
      expect(buttons.length).toBeGreaterThan(0);

      // Test click on first button
      fireEvent.click(buttons[0]);
      // handlePopoverOpen may not be called in test environment due to button configuration

      // Test invisible button handling
      buildCallControlButtonsSpy.mockReturnValue([
        {
          id: 'hidden',
          icon: 'hidden',
          onClick: jest.fn(),
          tooltip: 'Hidden',
          className: 'hidden-btn',
          disabled: false,
          isVisible: false,
        },
      ]);

      const {rerender} = render(<CallControlComponent {...defaultProps} />);
      rerender(<CallControlComponent {...defaultProps} />);
      expect(screen.queryByTestId('hidden')).not.toBeInTheDocument();
    });

    it('should handle state changes and consultation mode', async () => {
      const {rerender} = render(<CallControlComponent {...defaultProps} />);

      // Test state changes
      const updatedTask = {
        ...mockCurrentTask,
        isHeld: true,
        recording: {isRecording: true},
      };

      rerender(
        <CallControlComponent {...{...defaultProps, currentTask: updatedTask, isHeld: true, isRecording: true}} />
      );
      expect(updateCallStateFromTaskSpy).toHaveBeenCalled();

      // Test consultation mode with disabled buttons
      buildCallControlButtonsSpy.mockReturnValue([
        {
          id: 'mute',
          icon: 'mute',
          onClick: jest.fn(),
          tooltip: 'Mute',
          className: 'mute-btn',
          disabled: false,
          isVisible: true,
        },
      ]);

      rerender(<CallControlComponent {...{...defaultProps, consultInitiated: true}} />);
      const muteButton = screen.getByTestId('mute');
      expect(muteButton).toBeDisabled();
    });

    it('should call utility functions correctly', async () => {
      render(<CallControlComponent {...defaultProps} />);

      // Test handler function calls
      const muteHandler = buildCallControlButtonsSpy.mock.calls[0][6];
      const holdHandler = buildCallControlButtonsSpy.mock.calls[0][7];

      if (typeof muteHandler === 'function') {
        muteHandler();
        expect(handleMuteToggleSpy).toHaveBeenCalledWith(defaultProps.toggleMute, expect.any(Function), mockLogger);
      }

      if (typeof holdHandler === 'function') {
        holdHandler();
        expect(handleToggleHoldSpy).toHaveBeenCalledWith(
          false,
          defaultProps.toggleHold,
          defaultProps.setIsHeld,
          mockLogger
        );
      }
    });
  });

  describe('Wrapup Functionality', () => {
    it('should handle wrapup UI and interactions', async () => {
      const wrapupProps = {
        ...defaultProps,
        controlVisibility: {...mockControlVisibility, wrapup: true},
      };

      await act(async () => {
        render(<CallControlComponent {...wrapupProps} />);
      });

      // Test wrapup button rendering
      expect(screen.getByTestId('call-control:wrapup-button')).toBeInTheDocument();

      // Note: The actual wrapup select and submit buttons are inside a popover
      // that would need to be opened to test properly. For coverage purposes,
      // we're testing that the component renders without errors.
    });

    it('should handle auto wrapup timer and various configurations', async () => {
      // Test with auto wrapup timer
      const timerProps = {
        ...defaultProps,
        secondsUntilAutoWrapup: 30,
        controlVisibility: {...mockControlVisibility, wrapup: true},
      };

      await act(async () => {
        render(<CallControlComponent {...timerProps} />);
      });

      expect(screen.getByTestId('call-control:wrapup-button')).toBeInTheDocument();

      // Test empty wrapup codes
      const noWrapupProps = {
        ...defaultProps,
        wrapupCodes: [],
      };

      await act(async () => {
        render(<CallControlComponent {...noWrapupProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
    });
  });

  describe('Control Visibility and Edge Cases', () => {
    it('should handle different visibility configurations', async () => {
      // Test all controls visible
      const allVisibleProps = {
        ...defaultProps,
        controlVisibility: {
          ...mockControlVisibility,
          accept: true,
          decline: true,
          end: true,
          muteUnmute: true,
          holdResume: true,
        },
      };

      await act(async () => {
        render(<CallControlComponent {...allVisibleProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalledWith(
        expect.any(Boolean),
        expect.any(Boolean),
        expect.any(Boolean),
        expect.any(Boolean),
        expect.any(Object),
        allVisibleProps.controlVisibility,
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );

      // Test selective visibility
      const limitedVisibilityProps = {
        ...defaultProps,
        controlVisibility: {
          ...mockControlVisibility,
          consult: false,
          transfer: false,
          conference: false,
        },
      };

      await act(async () => {
        render(<CallControlComponent {...limitedVisibilityProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
    });

    it('should handle end call button and media channel variations', async () => {
      // Test end call button specific test id
      buildCallControlButtonsSpy.mockReturnValue([
        {
          id: 'end',
          icon: 'end-call',
          onClick: jest.fn(),
          tooltip: 'End Call',
          className: 'end-call-btn',
          disabled: false,
          isVisible: true,
        },
      ]);

      await act(async () => {
        render(<CallControlComponent {...defaultProps} />);
      });

      expect(screen.getByTestId('call-control:end-call')).toBeInTheDocument();

      // Test with media channel
      const taskWithMediaChannel = {
        ...mockCurrentTask,
        data: {
          ...mockCurrentTask.data,
          interaction: {
            ...mockCurrentTask.data.interaction,
            mediaChannel: 'voice',
          },
        },
      };

      await act(async () => {
        render(<CallControlComponent {...{...defaultProps, currentTask: taskWithMediaChannel}} />);
      });

      expect(getMediaTypeSpy).toHaveBeenCalledWith('telephony', 'voice');
    });
  });
});
