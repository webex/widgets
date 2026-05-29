import React from 'react';
import {render} from '@testing-library/react';
import CallControlCADComponent from '../../../../src/components/task/CallControlCAD/call-control-cad';
import {
  CallControlComponentProps,
  TARGET_TYPE,
  OUTBOUND_TYPE,
  CallAssociatedDataMap,
} from '../../../../src/components/task/task.types';
import {
  mockTask,
  createEnabledMainTaskUIControls,
  createMockTaskUIControls,
  enabledControl,
  mockCallAssociatedData,
} from '@webex/test-fixtures';
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
          dn: '555-999-0000',
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

  const mockControls = createEnabledMainTaskUIControls();

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
    isHeld: false,
    conferenceEnabled: true,
    controls: mockControls,
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
      isHeld: true,
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
      controls: createMockTaskUIControls({
        main: {endConsult: enabledControl},
        consult: {
          mute: enabledControl,
          switch: enabledControl,
          transfer: enabledControl,
          mergeToConference: enabledControl,
          endConsult: enabledControl,
        },
        activeLeg: 'consult',
      }),
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

  it('should display correct phone number for inbound vs outdial calls', () => {
    // Inbound call: caller ID = ani, phone number = ani
    const inboundScreen = render(<CallControlCADComponent {...defaultProps} />);
    // ani (555-123-4567) should appear as both caller ID and phone number
    const aniElements = inboundScreen.getAllByText('555-123-4567');
    expect(aniElements.length).toBe(2); // caller ID + phone number
    // dn (555-999-0000) should NOT appear anywhere
    expect(inboundScreen.queryByText('555-999-0000')).not.toBeInTheDocument();
    inboundScreen.unmount();

    // Outdial call: caller ID = dn, phone number = ani
    const outdialProps = {
      ...defaultProps,
      currentTask: {
        ...defaultProps.currentTask,
        data: {
          ...defaultProps.currentTask.data,
          interaction: {
            ...defaultProps.currentTask.data.interaction,
            outboundType: OUTBOUND_TYPE.OUTDIAL,
          },
        },
      },
    };
    const outdialScreen = render(<CallControlCADComponent {...outdialProps} />);
    // Caller ID should show dn (555-999-0000)
    expect(outdialScreen.getByText('555-999-0000')).toBeInTheDocument();
    // Phone number should show ani (555-123-4567)
    const phoneLabel = outdialScreen.getByText('Phone Number:');
    const phoneValue = phoneLabel.nextElementSibling;
    expect(phoneValue?.textContent).toBe('555-123-4567');
    outdialScreen.unmount();
  });

  it('should handle wrapup mode and edge cases', () => {
    // Test wrapup mode hides elements
    const wrapupProps = {
      ...defaultProps,
      controls: createEnabledMainTaskUIControls({wrapup: enabledControl}),
      isHeld: true,
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
    noDataScreen.unmount();

    // Test wrapup mode hiding recording indicator
    const noRecordingProps = {
      ...defaultProps,
      controls: createEnabledMainTaskUIControls({wrapup: enabledControl}),
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
      controls: createMockTaskUIControls({
        main: {endConsult: enabledControl},
        consult: {
          mute: enabledControl,
          switch: enabledControl,
          transfer: enabledControl,
          mergeToConference: enabledControl,
          endConsult: enabledControl,
        },
        activeLeg: 'consult',
      }),
    };
    const customScreen = render(<CallControlCADComponent {...customProps} />);
    const container = customScreen.container.querySelector('.call-control-container');
    expect(container).toHaveClass('custom-call-control');
    const customConsultContainer = customScreen.container.querySelector('.call-control-consult-container');
    expect(customConsultContainer).toHaveClass('custom-consult-control');
  });

  describe('on hold banner visibility', () => {
    const baseControls = {
      main: {
        wrapup: {isVisible: false, isEnabled: false},
        endConsult: {isVisible: false, isEnabled: false},
        exitConference: {isVisible: false, isEnabled: false},
      },
      consult: {
        endConsult: {isVisible: false, isEnabled: false},
      },
      activeLeg: 'main',
    };

    it('shows On hold banner when isHeld is true', () => {
      const screen = render(
        <CallControlCADComponent
          {...defaultProps}
          isHeld={true}
          holdTime={65}
          controls={baseControls as unknown as CallControlComponentProps['controls']}
        />
      );

      expect(screen.getByText(/On hold/)).toBeInTheDocument();
      expect(screen.getByText(/01:05/)).toBeInTheDocument();
    });

    it('hides On hold banner when isHeld is false', () => {
      const screen = render(
        <CallControlCADComponent
          {...defaultProps}
          isHeld={false}
          controls={baseControls as unknown as CallControlComponentProps['controls']}
        />
      );

      expect(screen.queryByText(/On hold/)).not.toBeInTheDocument();
    });

    it('hides On hold banner during wrapup even if isHeld is true', () => {
      const wrapupControls = {
        ...baseControls,
        main: {
          ...baseControls.main,
          wrapup: {isVisible: true, isEnabled: true},
        },
      };

      const screen = render(
        <CallControlCADComponent
          {...defaultProps}
          isHeld={true}
          controls={wrapupControls as unknown as CallControlComponentProps['controls']}
        />
      );

      expect(screen.queryByText(/On hold/)).not.toBeInTheDocument();
    });
  });

  describe('Global Variables', () => {
    const makePropsWithCallAssociatedData = (callAssociatedData: CallAssociatedDataMap) => ({
      ...defaultProps,
      currentTask: {
        ...defaultProps.currentTask,
        data: {
          ...defaultProps.currentTask.data,
          interaction: {
            ...defaultProps.currentTask.data.interaction,
            callAssociatedData,
          },
        },
      },
    });

    it('should render agent-viewable global variables', () => {
      const screen = render(<CallControlCADComponent {...makePropsWithCallAssociatedData(mockCallAssociatedData)} />);

      const globalVarsContainer = screen.getByTestId('global-variables-panel');
      expect(globalVarsContainer).toBeInTheDocument();

      expect(screen.getByText('Customer Language:')).toBeInTheDocument();
      expect(screen.getByText('English')).toBeInTheDocument();

      expect(screen.getByText('Post Call Survey Opt-in:')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
    });

    it('should not render non-global variables (e.g. system CAD like ani)', () => {
      const screen = render(<CallControlCADComponent {...makePropsWithCallAssociatedData(mockCallAssociatedData)} />);

      // ani is a system CAD key, filtered out by getAgentViewableGlobalVariables
      expect(screen.queryByText('ani:')).not.toBeInTheDocument();
    });

    it('should not render global variables where agentViewable is false', () => {
      const screen = render(<CallControlCADComponent {...makePropsWithCallAssociatedData(mockCallAssociatedData)} />);

      // Global_Hidden has agentViewable: false
      expect(screen.queryByText('Hidden Variable:')).not.toBeInTheDocument();
    });

    it('should not render global variables section when no global variables exist', () => {
      const screen = render(<CallControlCADComponent {...defaultProps} />);

      expect(screen.queryByTestId('global-variables-panel')).not.toBeInTheDocument();
    });

    it('should not render global variables section when callAssociatedData is undefined', () => {
      const propsWithNoData = {
        ...defaultProps,
        currentTask: {
          ...defaultProps.currentTask,
          data: {
            ...defaultProps.currentTask.data,
            interaction: {
              ...defaultProps.currentTask.data.interaction,
            },
          },
        },
      };
      const screen = render(<CallControlCADComponent {...propsWithNoData} />);

      expect(screen.queryByTestId('global-variables-panel')).not.toBeInTheDocument();
    });

    it('should use variable name as label when displayName is empty', () => {
      const dataWithEmptyDisplayName: CallAssociatedDataMap = {
        Global_NoDisplay: {
          name: 'Global_NoDisplay',
          displayName: '',
          value: 'some value',
          type: 'STRING',
          agentEditable: false,
          agentViewable: true,
          global: true,
          isSecure: false,
          secureKeyId: '',
          secureKeyVersion: 0,
        },
      };
      const screen = render(<CallControlCADComponent {...makePropsWithCallAssociatedData(dataWithEmptyDisplayName)} />);

      expect(screen.getByText('Global_NoDisplay:')).toBeInTheDocument();
      expect(screen.getByText('some value')).toBeInTheDocument();
    });
  });
});
