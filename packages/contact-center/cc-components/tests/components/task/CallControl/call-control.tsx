import React from 'react';
import {render, act} from '@testing-library/react';
import '@testing-library/jest-dom';
import CallControlComponent from '../../../../src/components/task/CallControl/call-control';
import {CallControlComponentProps} from '../../../../src/components/task/task.types';
import * as callControlUtils from '../../../../src/components/task/CallControl/call-control.utils';
import {mockTask} from '@webex/test-fixtures';

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
    wrapup: true,
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

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render component with basic props', async () => {
      await act(async () => {
        render(<CallControlComponent {...defaultProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
      expect(getMediaTypeSpy).toHaveBeenCalled();
      expect(isTelephonyMediaTypeSpy).toHaveBeenCalled();
    });

    it('should render with wrapup codes', async () => {
      const propsWithWrapup = {
        ...defaultProps,
        wrapupCodes: mockWrapupCodes,
      };

      await act(async () => {
        render(<CallControlComponent {...propsWithWrapup} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
    });

    it('should handle consultation mode rendering', async () => {
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

  describe('State Management', () => {
    it('should update call state from task changes', async () => {
      const {rerender} = render(<CallControlComponent {...defaultProps} />);

      const updatedTask = {
        ...mockCurrentTask,
        isHeld: true,
        recording: {isRecording: true},
      };

      const updatedProps = {
        ...defaultProps,
        currentTask: updatedTask,
        isHeld: true,
        isRecording: true,
      };

      rerender(<CallControlComponent {...updatedProps} />);

      expect(updateCallStateFromTaskSpy).toHaveBeenCalled();
    });

    it('should handle multiple state changes', async () => {
      const {rerender} = render(<CallControlComponent {...defaultProps} />);

      const stateVariations = [
        {...defaultProps, isMuted: true},
        {...defaultProps, isHeld: true},
        {...defaultProps, isRecording: true},
      ];

      for (const props of stateVariations) {
        rerender(<CallControlComponent {...props} />);
      }

      expect(buildCallControlButtonsSpy).toHaveBeenCalledTimes(stateVariations.length + 1); // +1 for initial render
    });
  });

  describe('User Interactions', () => {
    it('should build control buttons with correct parameters', async () => {
      await act(async () => {
        render(<CallControlComponent {...defaultProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalledWith(
        false, // isMuted
        false, // isHeld
        false, // isRecording
        false, // isMuteButtonDisabled
        {labelName: 'Voice'},
        mockControlVisibility,
        expect.any(Function),
        expect.any(Function),
        defaultProps.toggleRecording,
        defaultProps.endCall
      );
    });

    it('should handle agent menu interactions', async () => {
      const menuProps = {
        ...defaultProps,
        buddyAgents: mockBuddyAgents,
      };

      await act(async () => {
        render(<CallControlComponent {...menuProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
    });
  });

  describe('Utility Function Integration', () => {
    it('should call utility functions for media type checking', async () => {
      await act(async () => {
        render(<CallControlComponent {...defaultProps} />);
      });

      expect(getMediaTypeSpy).toHaveBeenCalledWith('telephony', undefined);
      expect(isTelephonyMediaTypeSpy).toHaveBeenCalledWith('telephony');
    });

    it('should handle consultation filtering', async () => {
      const consultProps = {
        ...defaultProps,
        consultInitiated: true,
      };

      await act(async () => {
        render(<CallControlComponent {...consultProps} />);
      });

      expect(filterButtonsForConsultationSpy).toHaveBeenCalledWith(expect.any(Array), true, true);
    });
  });

  describe('Wrapup Functionality', () => {
    it('should handle wrapup with codes', async () => {
      const wrapupProps = {
        ...defaultProps,
        wrapupCodes: mockWrapupCodes,
        selectedWrapupReason: 'Customer Issue',
        selectedWrapupId: 'wrap1',
      };

      await act(async () => {
        render(<CallControlComponent {...wrapupProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
    });

    it('should handle auto wrapup timer', async () => {
      const timerProps = {
        ...defaultProps,
        autoWrapupTimer: {
          duration: 60,
          status: 'active' as const,
          timeRemaining: 30,
        },
      };

      await act(async () => {
        render(<CallControlComponent {...timerProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing wrapup codes', async () => {
      const noWrapupProps = {
        ...defaultProps,
        wrapupCodes: [],
      };

      await act(async () => {
        render(<CallControlComponent {...noWrapupProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
    });

    it('should handle disabled button states', async () => {
      const disabledProps = {
        ...defaultProps,
        isButtonDisabledForAnyReason: true,
      };

      await act(async () => {
        render(<CallControlComponent {...disabledProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
    });

    it('should handle null audio stream', async () => {
      const audioProps = {
        ...defaultProps,
        callControlAudio: null as unknown as MediaStream,
      };

      await act(async () => {
        render(<CallControlComponent {...audioProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalled();
    });
  });

  describe('Control Visibility', () => {
    it('should handle all controls visible', async () => {
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
    });

    it('should handle selective control visibility', async () => {
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
  });

  describe('Media Type Handling', () => {
    it('should handle non-telephony media types', async () => {
      const nonTelephonyTask = {
        ...mockCurrentTask,
        mediaType: 'chat',
      };

      const chatProps = {
        ...defaultProps,
        currentTask: nonTelephonyTask,
        isTelephony: false,
      };

      // Update spy to return false for non-telephony
      isTelephonyMediaTypeSpy.mockReturnValue(false);

      await act(async () => {
        render(<CallControlComponent {...chatProps} />);
      });

      expect(isTelephonyMediaTypeSpy).toHaveBeenCalledWith('telephony');
    });

    it('should get correct media type info', async () => {
      // Update spy to return different media type
      getMediaTypeSpy.mockReturnValue({labelName: 'Chat'});

      await act(async () => {
        render(<CallControlComponent {...defaultProps} />);
      });

      expect(buildCallControlButtonsSpy).toHaveBeenCalledWith(
        expect.any(Boolean),
        expect.any(Boolean),
        expect.any(Boolean),
        expect.any(Boolean),
        {labelName: 'Chat'},
        expect.any(Object),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });
  });
});
