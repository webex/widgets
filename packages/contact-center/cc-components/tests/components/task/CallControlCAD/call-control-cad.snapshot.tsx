import React from 'react';
import {render} from '@testing-library/react';
import CallControlCADComponent from '../../../../src/components/task/CallControlCAD/call-control-cad';
import {CallControlComponentProps} from '../../../../src/components/task/task.types';
import {mockTask} from '@webex/test-fixtures';
import {BuddyDetails} from '@webex/cc-store';
import '@testing-library/jest-dom';

const mockUIDProps = (container: Element) => {
  container.querySelectorAll('[id^="mdc-input"]').forEach((el: Element) => el.setAttribute('id', 'mock-input-id'));
  container.querySelectorAll('[id^="mdc-tooltip"]').forEach((el: Element) => el.setAttribute('id', 'mock-tooltip-id'));
  container
    .querySelectorAll('[aria-describedby^="mdc-tooltip"]')
    .forEach((el: Element) => el.setAttribute('aria-describedby', 'mock-aria-describedby'));
  container.querySelectorAll('[id^="mdc-popover"]').forEach((el: Element) => el.setAttribute('id', 'mock-popover-id'));
  container.querySelectorAll('[id^="mdc-select"]').forEach((el: Element) => el.setAttribute('id', 'mock-select-id'));
  container.querySelectorAll('[id^="mdc-button"]').forEach((el: Element) => el.setAttribute('id', 'mock-button-id'));
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

// Mock TaskTimer component to avoid Worker issues in Jest
jest.mock('../../../../src/components/task/TaskTimer/index', () =>
  // eslint-disable-next-line react/display-name
  () => <span data-testid="TaskTimer">00:00</span>
);

// Mock utilities that require external dependencies
jest.mock('../../../../src/utils', () => ({
  getMediaTypeInfo: jest.fn((mediaType) => ({
    labelName: mediaType === 'telephony' ? 'Voice' : mediaType === 'chat' ? 'Chat' : 'Social',
    iconName: mediaType === 'telephony' ? 'headset' : mediaType === 'chat' ? 'chat' : 'facebook',
    className: mediaType === 'telephony' ? 'voice-media' : mediaType === 'chat' ? 'chat-media' : 'social-media',
    isBrandVisual: mediaType === 'social',
  })),
}));

describe('CallControlCADComponent Snapshots', () => {
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
    autoWrapup: undefined,
  };

  const mockWrapupCodes = [
    {id: 'wrap1', name: 'Customer Issue'},
    {id: 'wrap2', name: 'Technical Support'},
  ];

  const mockBuddyAgents: BuddyDetails[] = [
    {
      agentId: 'agent1',
      agentName: 'John Doe',
      state: 'Available',
      teamId: 'team1',
      dn: '1001',
      siteId: 'site1',
    },
    {
      agentId: 'agent2',
      agentName: 'Jane Smith',
      state: 'Available',
      teamId: 'team1',
      dn: '1002',
      siteId: 'site1',
    },
  ] as BuddyDetails[];

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
    callControlAudio: null,
    consultAgentName: '',
    setConsultAgentName: jest.fn(),
    holdTime: 0,
    callControlClassName: '',
    callControlConsultClassName: '',
    startTimestamp: 1234567890000,
    stateTimerLabel: null,
    stateTimerTimestamp: 0,
    consultTimerLabel: 'Consulting',
    consultTimerTimestamp: 0,
    allowConsultToQueue: true,
    lastTargetType: 'agent',
    setLastTargetType: jest.fn(),
    controlVisibility: {
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
    },
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

  it('should render basic call states and media types', async () => {
    // Default telephony state
    let screen = render(<CallControlCADComponent {...defaultProps} />);
    let container = screen.container.querySelector('.call-control-container');
    mockUIDProps(container!);
    expect(container).toMatchSnapshot('default-telephony');
    screen.unmount();

    // Muted, held, and recording states combined
    const combinedStateProps = {
      ...defaultProps,
      isMuted: true,
      isHeld: true,
      isRecording: true,
      holdTime: 125,
    };
    screen = render(<CallControlCADComponent {...combinedStateProps} />);
    container = screen.container.querySelector('.call-control-container');
    mockUIDProps(container!);
    expect(container).toMatchSnapshot('combined-states');
    screen.unmount();

    // Chat media type
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
            interactionId: 'chat-interaction-123',
            callAssociatedDetails: {
              customerName: 'Chat Customer',
              ani: 'chat-customer@example.com',
              virtualTeamName: 'Chat Support Team',
              ronaTimeout: '45',
            },
          },
        },
      },
    };
    screen = render(<CallControlCADComponent {...chatProps} />);
    container = screen.container.querySelector('.call-control-container');
    mockUIDProps(container!);
    expect(container).toMatchSnapshot('chat-media-type');
    screen.unmount();

    // Social media type
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
            interactionId: 'social-interaction-123',
            callAssociatedDetails: {
              customerName: 'Social Customer',
              ani: '@socialuser',
              virtualTeamName: 'Social Media Team',
              ronaTimeout: '60',
            },
          },
        },
      },
    };
    screen = render(<CallControlCADComponent {...socialProps} />);
    container = screen.container.querySelector('.call-control-container');
    mockUIDProps(container!);
    expect(container).toMatchSnapshot('social-media-type');
  });

  it('should render consultation and wrapup modes', async () => {
    // Consultation initiated
    const consultProps = {...defaultProps, consultInitiated: true, consultAgentName: 'Consult Agent'};
    let screen = render(<CallControlCADComponent {...consultProps} />);
    let mainContainer = screen.container.querySelector('.call-control-container');
    let consultContainer = screen.container.querySelector('.call-control-consult-container');
    mockUIDProps(mainContainer!);
    if (consultContainer) {
      mockUIDProps(consultContainer);
    }
    expect(screen.container).toMatchSnapshot('consultation-initiated');
    screen.unmount();

    // Consultation accepted
    const consultAcceptedProps = {
      ...defaultProps,
      controlVisibility: {
        ...defaultProps.controlVisibility,
        isConsultInitiatedOrAccepted: true,
      },
      consultAgentName: 'Consult Agent',
    };
    screen = render(<CallControlCADComponent {...consultAcceptedProps} />);
    mainContainer = screen.container.querySelector('.call-control-container');
    consultContainer = screen.container.querySelector('.call-control-consult-container');
    mockUIDProps(mainContainer!);
    if (consultContainer) {
      mockUIDProps(consultContainer);
    }
    expect(screen.container).toMatchSnapshot('consultation-accepted');
    screen.unmount();

    // Wrapup mode
    const wrapupProps = {
      ...defaultProps,
      controlVisibility: {...defaultProps.controlVisibility, wrapup: true},
    };
    screen = render(<CallControlCADComponent {...wrapupProps} />);
    const container = screen.container.querySelector('.call-control-container');
    mockUIDProps(container!);
    expect(container).toMatchSnapshot('wrapup-mode');
    screen.unmount();

    // Consultation with wrapup (consultation should be hidden)
    const consultWrapupProps = {
      ...defaultProps,
      controlVisibility: {
        ...defaultProps.controlVisibility,
        isConsultInitiatedOrAccepted: true,
        wrapup: true,
      },
      consultAgentName: 'Consult Agent',
    };
    screen = render(<CallControlCADComponent {...consultWrapupProps} />);
    const wrapupContainer = screen.container.querySelector('.call-control-container');
    mockUIDProps(wrapupContainer!);
    expect(wrapupContainer).toMatchSnapshot('consultation-hidden-in-wrapup');
  });

  it('should handle edge cases and control visibility', async () => {
    // No customer information
    const noCustomerProps = {
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
    let screen = render(<CallControlCADComponent {...noCustomerProps} />);
    let container = screen.container.querySelector('.call-control-container');
    mockUIDProps(container!);
    expect(container).toMatchSnapshot('no-customer-information');
    screen.unmount();

    // Limited control visibility
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
        recordingIndicator: false,
      },
    };
    screen = render(<CallControlCADComponent {...limitedControlsProps} />);
    container = screen.container.querySelector('.call-control-container');
    mockUIDProps(container!);
    expect(container).toMatchSnapshot('limited-control-visibility');
    screen.unmount();

    // Custom CSS classes with consultation
    const customProps = {
      ...defaultProps,
      callControlClassName: 'custom-call-control',
      callControlConsultClassName: 'custom-consult-control',
      controlVisibility: {
        ...defaultProps.controlVisibility,
        isConsultInitiatedOrAccepted: true,
      },
      consultAgentName: 'Consult Agent',
    };
    screen = render(<CallControlCADComponent {...customProps} />);
    const mainContainer = screen.container.querySelector('.call-control-container');
    const consultContainer = screen.container.querySelector('.call-control-consult-container');
    mockUIDProps(mainContainer!);
    if (consultContainer) {
      mockUIDProps(consultContainer);
    }
    expect(screen.container).toMatchSnapshot('custom-css-classes');
  });
});
