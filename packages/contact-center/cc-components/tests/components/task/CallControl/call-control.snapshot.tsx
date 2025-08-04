import React from 'react';
import '@testing-library/jest-dom';
import {render, fireEvent, act} from '@testing-library/react';
import CallControlComponent from '../../../../src/components/task/CallControl/call-control';
import {CallControlComponentProps} from '../../../../src/components/task/task.types';
import {mockTask, mockQueueDetails, mockAgents, mockProfile, mockCC} from '@webex/test-fixtures';
import {BuddyDetails, ContactServiceQueue, IWrapupCode} from '@webex/cc-store';

const mockUIDProps = (container) => {
  container
    .querySelectorAll('[id^="mdc-input"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('id', 'mock-input-id'));
  container
    .querySelectorAll('[id^="mdc-tooltip"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('id', 'mock-tooltip-id'));
  container
    .querySelectorAll('[aria-describedby^="mdc-tooltip"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('aria-describedby', 'mock-aria-describedby'));
  container
    .querySelectorAll('[id^="mdc-popover"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('id', 'mock-popover-id'));
  container
    .querySelectorAll('[id^="mdc-select"]')
    .forEach((el: HTMLBaseElement) => el.setAttribute('id', 'mock-select-id'));
};

// Mock MediaStream for testing
Object.defineProperty(window, 'MediaStream', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    getTracks: jest.fn(() => []),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
  })),
});

describe('CallControlComponent Snapshots', () => {
  const mockLogger = mockCC.LoggerProxy;

  const mockCurrentTask = {
    ...mockTask,
    id: `task-${mockProfile.agentId}`,
    data: {
      ...mockTask.data,
      interaction: {
        ...mockTask.data.interaction,
        mediaType: 'telephony',
        mediaChannel: 'telephony',
      },
    },
    status: 'connected',
    isHeld: false,
    recording: {isRecording: false},
    wrapUpReason: null,
    autoWrapup: undefined,
  };

  const mockWrapupCodes: IWrapupCode[] = mockProfile.wrapupCodes;

  const mockBuddyAgents: BuddyDetails[] = mockAgents.map((agent) => ({
    ...agent,
    firstName: agent.name.split(' ')[0] || agent.name,
    lastName: agent.name.split(' ')[1] || '',
    teamName: mockProfile.teams[0]?.teamName || 'Team 1',
    siteName: `Site-${mockProfile.siteId}`,
    profileId: mockProfile.agentProfileID,
    agentSessionId: `session-${mockProfile.agentId}`,
    stateChangeTime: mockProfile.lastStateChangeTimestamp,
    auxiliaryCodeId: mockProfile.lastStateAuxCodeId,
    teamIds: [mockProfile.teams[0]?.teamId || 'team1'],
  })) as BuddyDetails[];

  const mockQueues: ContactServiceQueue[] = mockQueueDetails.map((queue) => ({
    id: queue.id,
    name: queue.name,
    description: queue.description,
    queueType: queue.queueType,
    checkAgentAvailability: queue.checkAgentAvailability,
    channelType: queue.channelType,
  })) as ContactServiceQueue[];

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
    transferCall: jest.fn(),
    consultCall: jest.fn(),
    endConsultCall: jest.fn(),
    consultInitiated: false,
    consultTransfer: jest.fn(),
    consultCompleted: false,
    consultAccepted: false,
    consultStartTimeStamp: undefined,
    callControlAudio: null,
    consultAgentName: '',
    setConsultAgentName: jest.fn(),
    consultAgentId: '',
    setConsultAgentId: jest.fn(),
    holdTime: 0,
    callControlClassName: '',
    callControlConsultClassName: '',
    startTimestamp: Date.now(),
    queues: mockQueues,
    loadQueues: jest.fn(),
    isEndConsultEnabled: mockProfile.isEndConsultEnabled,
    allowConsultToQueue: mockProfile.allowConsultToQueue,
    lastTargetType: 'agent',
    setLastTargetType: jest.fn(),
    controlVisibility: {
      accept: true,
      decline: true,
      end: true,
      muteUnmute: true,
      holdResume: true,
      consult: true,
      transfer: true,
      conference: true,
      wrapup: false,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
    },
    logger: mockLogger,
    secondsUntilAutoWrapup: undefined,
    cancelAutoWrapup: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Tests for UI elements and visual states of CallControl component', () => {
    it('should render the component with default call control buttons', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...defaultProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with muted state', async () => {
      const mutedProps = {...defaultProps, isMuted: true};
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...mutedProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with held state', async () => {
      const heldProps = {...defaultProps, isHeld: true};
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...heldProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with recording state', async () => {
      const recordingProps = {...defaultProps, isRecording: true};
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...recordingProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with wrapup mode', async () => {
      const wrapupProps = {
        ...defaultProps,
        controlVisibility: {...defaultProps.controlVisibility, wrapup: true},
      };
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...wrapupProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with consultation initiated', async () => {
      const consultProps = {...defaultProps, consultInitiated: true};
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...consultProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with consultation accepted', async () => {
      const consultAcceptedProps = {...defaultProps, consultAccepted: true};
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...consultAcceptedProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with limited control visibility', async () => {
      const limitedControlsProps = {
        ...defaultProps,
        controlVisibility: {
          accept: true,
          decline: true,
          end: true,
          muteUnmute: true,
          holdResume: false,
          consult: false,
          transfer: false,
          conference: false,
          wrapup: false,
          pauseResumeRecording: false,
          endConsult: true,
          recordingIndicator: true,
        },
      };
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...limitedControlsProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render with chat media type', async () => {
      const chatProps = {
        ...defaultProps,
        currentTask: {
          ...defaultProps.currentTask,
          data: {
            ...defaultProps.currentTask.data,
            interaction: {
              ...defaultProps.currentTask.data.interaction,
              mediaType: 'chat',
              mediaChannel: 'chat',
            },
          },
        },
      };
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...chatProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('Interactions', () => {
    it('should handle mute button click', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...defaultProps} />);
      });

      const muteButton = screen.getByTestId('call-control:mute-toggle');
      fireEvent.click(muteButton);

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle hold button click', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...defaultProps} />);
      });

      const holdButton = screen.getByTestId('call-control:hold-toggle');
      fireEvent.click(holdButton);

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle record button click', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...defaultProps} />);
      });

      const recordButton = screen.getByTestId('call-control:recording-toggle');
      fireEvent.click(recordButton);

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle end call button click', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...defaultProps} />);
      });

      const endCallButton = screen.getByTestId('call-control:end-call');
      fireEvent.click(endCallButton);

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should render wrapup button in wrapup mode', async () => {
      const wrapupProps = {
        ...defaultProps,
        controlVisibility: {...defaultProps.controlVisibility, wrapup: true},
      };
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...wrapupProps} />);
      });

      // The wrapup submit button is inside a popover that needs to be opened
      const wrapupButton = screen.getByTestId('call-control:wrapup-button');
      expect(wrapupButton).toBeInTheDocument();

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });

  describe('State Management', () => {
    it('should update when hold state changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...defaultProps} />);
      });

      screen.rerender(<CallControlComponent {...defaultProps} isHeld={true} />);
      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should update when mute state changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...defaultProps} />);
      });

      screen.rerender(<CallControlComponent {...defaultProps} isMuted={true} />);
      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should update when recording state changes', async () => {
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...defaultProps} />);
      });

      screen.rerender(<CallControlComponent {...defaultProps} isRecording={true} />);
      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle combination of states: muted, held, and recording', async () => {
      const combinedStateProps = {
        ...defaultProps,
        isMuted: true,
        isHeld: true,
        isRecording: true,
      };
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...combinedStateProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle edge case with no buddy agents', async () => {
      const noBuddyAgentsProps = {...defaultProps, buddyAgents: []};
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...noBuddyAgentsProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle edge case with no queues', async () => {
      const noQueuesProps = {...defaultProps, queues: []};
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...noQueuesProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });

    it('should handle edge case with no wrapup codes', async () => {
      const noWrapupCodesProps = {
        ...defaultProps,
        wrapupCodes: [],
        controlVisibility: {...defaultProps.controlVisibility, wrapup: true},
      };
      let screen;
      await act(async () => {
        screen = render(<CallControlComponent {...noWrapupCodesProps} />);
      });

      const container = screen.container.querySelector('.call-control-container');
      mockUIDProps(container);
      expect(container).toMatchSnapshot();
    });
  });
});
