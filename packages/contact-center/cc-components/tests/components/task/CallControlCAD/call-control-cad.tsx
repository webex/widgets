import React from 'react';
import {render} from '@testing-library/react';
import CallControlCADComponent from '../../../../src/components/task/CallControlCAD/call-control-cad';
import {CallControlComponentProps} from '../../../../src/components/task/task.types';
import {mockTask} from '@webex/test-fixtures';
import {BuddyDetails} from '@webex/cc-store';
import '@testing-library/jest-dom';

// Mock MediaStream for testing
Object.defineProperty(window, 'MediaStream', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    getTracks: jest.fn(() => []),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
  })),
});

// Mock TaskTimer component to avoid Worker issues in Jest
jest.mock('../../../../src/components/task/TaskTimer/index', () =>
  // eslint-disable-next-line react/display-name
  () => <span data-testid="TaskTimer">00:00</span>
);

// Mock utilities that require external dependencies
jest.mock('../../../../src/utils', () => ({
  getMediaTypeInfo: jest.fn((mediaType) => ({
    labelName: mediaType === 'telephony' ? 'Voice' : 'Chat',
    iconName: mediaType === 'telephony' ? 'headset' : 'chat',
    className: mediaType === 'telephony' ? 'voice-media' : 'chat-media',
    isBrandVisual: false,
  })),
}));

describe('CallControlCADComponent', () => {
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
    data: {
      ...mockTask.data,
      interaction: {
        ...mockTask.data.interaction,
        mediaType: 'telephony',
        mediaChannel: 'telephony',
        interactionId: 'interaction-123',
        callAssociatedDetails: {
          customerName: 'John Doe',
          ani: '555-123-4567',
          virtualTeamName: 'Support Team',
          ronaTimeout: '30',
        },
      },
    },
    status: 'connected',
    isHeld: false,
    recording: {isRecording: false},
    wrapUpReason: null,
  };

  const mockWrapupCodes = [
    {id: 'wrap1', name: 'Customer Issue', isSystem: false},
    {id: 'wrap2', name: 'Technical Support', isSystem: false},
  ];

  const mockBuddyAgents: BuddyDetails[] = [
    {
      agentId: 'agent1',
      agentName: 'John Doe',
      dn: '1001',
      teamId: 'team1',
      siteId: 'site1',
      state: 'Available',
    } as BuddyDetails,
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
    wrapup: {isVisible: false, isEnabled: false},
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
    transferCall: jest.fn(),
    consultCall: jest.fn(),
    endConsultCall: jest.fn(),
    consultTransfer: jest.fn(),
    consultStartTimeStamp: Date.now(),
    callControlAudio: null as unknown as MediaStream,
    consultAgentName: '',
    setConsultAgentName: jest.fn(),
    holdTime: 0,
    callControlClassName: '',
    callControlConsultClassName: '',
    startTimestamp: Date.now(),
    allowConsultToQueue: true,
    lastTargetType: 'agent',
    setLastTargetType: jest.fn(),
    controlVisibility: mockControlVisibility,
    logger: mockLogger,
    secondsUntilAutoWrapup: undefined,
    cancelAutoWrapup: jest.fn(),
    exitConference: jest.fn(),
    consultConference: jest.fn(),
    switchToMainCall: jest.fn(),
    switchToConsult: jest.fn(),
    conferenceParticipants: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render telephony call control with all basic information', () => {
    const screen = render(<CallControlCADComponent {...defaultProps} />);

    // Verify main structure
    const container = screen.container.querySelector('.call-control-container');
    expect(container).toBeInTheDocument();

    // Verify call information display
    expect(screen.getByText('Queue:')).toBeInTheDocument();
    expect(screen.getByText('Support Team')).toBeInTheDocument();
    expect(screen.getByText('Phone Number:')).toBeInTheDocument();
    expect(screen.getByText('RONA:')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();

    // Verify media icon and timer
    const mediaIcon = screen.container.querySelector('.media-icon.voice-media');
    expect(mediaIcon).toBeInTheDocument();
    const timerElement = screen.container.querySelector('.call-timer');
    expect(timerElement).toBeInTheDocument();

    // Verify recording indicator
    const recordingIndicator = screen.container.querySelector('.recording-indicator');
    expect(recordingIndicator).toBeInTheDocument();

    // Verify phone numbers displayed
    const phoneNumbers = screen.getAllByText('555-123-4567');
    expect(phoneNumbers.length).toBeGreaterThan(0);
  });

  it('should handle different states and media types', () => {
    // Test held state with hold time
    const heldProps = {
      ...defaultProps,
      controlVisibility: {
        ...mockControlVisibility,
        isHeld: true,
      },
      holdTime: 65,
    };
    const heldScreen = render(<CallControlCADComponent {...heldProps} />);
    expect(heldScreen.getByText(/On hold/)).toBeInTheDocument();
    expect(heldScreen.getByText(/01:05/)).toBeInTheDocument();
    const holdIcon = heldScreen.container.querySelector('.call-hold-filled-icon');
    expect(holdIcon).toBeInTheDocument();
    heldScreen.unmount();

    // Test social media interaction
    const socialProps = {
      ...defaultProps,
      currentTask: {
        ...defaultProps.currentTask,
        data: {
          ...defaultProps.currentTask.data,
          interaction: {
            ...defaultProps.currentTask.data.interaction,
            mediaType: 'social',
            mediaChannel: 'social',
            callAssociatedDetails: {
              customerName: 'Social Customer',
              ani: '555-123-4567',
              virtualTeamName: 'Support Team',
              ronaTimeout: '30',
            },
          },
        },
      },
    };
    const socialScreen = render(<CallControlCADComponent {...socialProps} />);
    expect(socialScreen.getByText('Customer Name')).toBeInTheDocument();
    const socialCustomerNames = socialScreen.getAllByText('Social Customer');
    expect(socialCustomerNames.length).toBeGreaterThan(0);
    socialScreen.unmount();

    // Test consultation functionality for telephony
    const consultProps = {
      ...defaultProps,
      consultAgentName: 'Consult Agent',
      consultStartTimeStamp: Date.now(),
      controlVisibility: {
        ...mockControlVisibility,
        isConsultInitiatedOrAccepted: true,
      },
    };
    const consultScreen = render(<CallControlCADComponent {...consultProps} />);
    const consultContainer = consultScreen.container.querySelector('.call-control-consult-container');
    expect(consultContainer).toBeInTheDocument();
    consultScreen.unmount();

    // Test that consultation is hidden for non-telephony
    const chatConsultProps = {
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
    const chatConsultScreen = render(<CallControlCADComponent {...chatConsultProps} />);
    const chatConsultContainer = chatConsultScreen.container.querySelector('.call-control-consult-container');
    expect(chatConsultContainer).not.toBeInTheDocument();
    chatConsultScreen.unmount();
  });

  it('should handle wrapup mode and edge cases', () => {
    // Test wrapup mode hides elements
    const wrapupProps = {
      ...defaultProps,
      controlVisibility: {
        ...mockControlVisibility,
        wrapup: {isVisible: true, isEnabled: true},
        isHeld: true,
      },
      isRecording: true,
    };
    const screen = render(<CallControlCADComponent {...wrapupProps} />);

    // Verify elements are hidden in wrapup mode
    expect(screen.queryByText('On Hold')).not.toBeInTheDocument();
    const recordingIndicator = screen.container.querySelector('.recording-indicator');
    expect(recordingIndicator).not.toBeInTheDocument();
    const consultContainer = screen.container.querySelector('.call-control-consult-container');
    expect(consultContainer).not.toBeInTheDocument();
    screen.unmount();

    // Test fallback values when data is missing
    const noDataProps = {
      ...defaultProps,
      currentTask: {
        ...defaultProps.currentTask,
        data: {
          ...defaultProps.currentTask.data,
          interaction: {
            ...defaultProps.currentTask.data.interaction,
            callAssociatedDetails: {},
          },
        },
      },
    };
    const noDataScreen = render(<CallControlCADComponent {...noDataProps} />);
    expect(noDataScreen.getByText('No Caller ID')).toBeInTheDocument();
    expect(noDataScreen.getByText('No Team Name')).toBeInTheDocument();
    expect(noDataScreen.getByText('No Phone Number')).toBeInTheDocument();
    expect(noDataScreen.getByText('No RONA')).toBeInTheDocument();
    noDataScreen.unmount();

    // Test controlVisibility hiding recording indicator
    const noRecordingProps = {
      ...defaultProps,
      controlVisibility: {
        ...mockControlVisibility,
        recordingIndicator: false,
      },
    };
    const noRecordingScreen = render(<CallControlCADComponent {...noRecordingProps} />);
    const hiddenRecordingIndicator = noRecordingScreen.container.querySelector('.recording-indicator');
    expect(hiddenRecordingIndicator).not.toBeInTheDocument();
    noRecordingScreen.unmount();

    // Test custom CSS classes
    const customProps = {
      ...defaultProps,
      callControlClassName: 'custom-call-control',
      callControlConsultClassName: 'custom-consult-control',
      controlVisibility: {
        ...mockControlVisibility,
        isConsultInitiatedOrAccepted: true,
      },
    };
    const customScreen = render(<CallControlCADComponent {...customProps} />);
    const container = customScreen.container.querySelector('.call-control-container');
    expect(container).toHaveClass('custom-call-control');
    const customConsultContainer = customScreen.container.querySelector('.call-control-consult-container');
    expect(customConsultContainer).toHaveClass('custom-consult-control');
  });
});
