import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react';
import CallControlCADComponent from '../../../../src/components/task/CallControlCAD/call-control-cad';
import {CallControlComponentProps, TARGET_TYPE, OUTBOUND_TYPE} from '../../../../src/components/task/task.types';
import {
  mockTask,
  createEnabledMainTaskUIControls,
  createMockTaskUIControls,
  enabledControl,
} from '@webex/test-fixtures';
import {BuddyDetails, ConferenceParticipantDropRoster} from '@webex/cc-store';
import '@testing-library/jest-dom';

jest.mock('@momentum-ui/react-collaboration', () => {
  const actual = jest.requireActual('@momentum-ui/react-collaboration');
  const react = jest.requireActual('react');

  const popover = ({triggerComponent, children}: {triggerComponent: React.ReactNode; children: React.ReactNode}) =>
    react.createElement(react.Fragment, null, triggerComponent, children);

  return new Proxy(actual, {
    get: (target, property) => (property === 'PopoverNext' ? popover : Reflect.get(target, property)),
  });
});

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
  const ownerDropRoster: ConferenceParticipantDropRoster = {
    customer: {
      participantType: 'Customer',
      displayName: '+15551234567',
      dropTargetId: '+15551234567',
      isPrimary: false,
      isReadOnly: false,
      isDropDisabled: false,
      requiresConfirmation: true,
    },
    participants: [
      {
        participantType: 'Agent',
        displayName: 'Agent Two',
        dropTargetId: 'agent-2',
        isPrimary: false,
        isReadOnly: false,
        isDropDisabled: false,
        requiresConfirmation: false,
      },
    ],
    isDropDisabled: false,
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
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function showModal() {
        this.setAttribute('open', '');
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function close() {
        this.removeAttribute('open');
      },
    });
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

  it.skip('should display correct phone number for inbound vs outdial calls', () => {
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

  describe('conference participant Drop', () => {
    const renderRoster = (overrides: Partial<CallControlComponentProps> = {}) => {
      const dropConferenceParticipant = jest.fn().mockResolvedValue(undefined);
      const screen = render(
        <CallControlCADComponent
          {...defaultProps}
          controls={createEnabledMainTaskUIControls({exitConference: {isVisible: true, isEnabled: true}})}
          conferenceParticipants={[{id: 'agent-2', name: 'Agent Two', pType: 'Agent'}]}
          conferenceParticipantDropRoster={ownerDropRoster}
          pendingParticipantDropId={null}
          participantDropAnnouncement={null}
          dropConferenceParticipant={dropConferenceParticipant}
          {...overrides}
        />
      );

      fireEvent.click(screen.getByTestId('call-control:participants-trigger'));

      return {screen, dropConferenceParticipant};
    };

    it('renders Customer and Participants sections and immediately drops an Agent target', () => {
      const {screen, dropConferenceParticipant} = renderRoster();

      expect(screen.getByRole('heading', {name: 'Customer'})).toBeInTheDocument();
      expect(screen.getByRole('heading', {name: 'Participants'})).toBeInTheDocument();
      expect(screen.getByText('+15551234567')).toBeInTheDocument();
      expect(screen.getByText('Agent Two')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', {name: 'Drop agent Agent Two'}));

      expect(dropConferenceParticipant).toHaveBeenCalledWith(ownerDropRoster.participants[0]);
    });

    it('keeps the Participants section when the Customer row is removed', () => {
      const {screen} = renderRoster({
        conferenceParticipantDropRoster: {
          ...ownerDropRoster,
          customer: null,
          participants: [
            ...ownerDropRoster.participants,
            {
              participantType: 'Agent',
              displayName: 'Agent Three',
              dropTargetId: 'agent-3',
              isPrimary: false,
              isReadOnly: false,
              isDropDisabled: false,
              requiresConfirmation: false,
            },
          ],
        },
      });

      expect(screen.queryByRole('heading', {name: 'Customer'})).not.toBeInTheDocument();
      expect(screen.getByRole('heading', {name: 'Participants'})).toBeInTheDocument();
      expect(screen.getByText('Agent Two')).toBeInTheDocument();
      expect(screen.getByText('Agent Three')).toBeInTheDocument();
      expect(screen.getByRole('button', {name: 'Drop agent Agent Two'})).toBeEnabled();
    });

    it('keeps a valid multiparty roster visible when wrap-up controls appear', () => {
      const {screen} = renderRoster({
        controls: createEnabledMainTaskUIControls({wrapup: {isVisible: true, isEnabled: true}}),
      });

      expect(screen.getByTestId('call-control:participants-trigger')).toBeInTheDocument();
      expect(screen.getByRole('heading', {name: 'Customer'})).toBeInTheDocument();
      expect(screen.getByRole('heading', {name: 'Participants'})).toBeInTheDocument();
    });

    it('requires confirmation for Customer Drop and cancel restores focus without invoking the SDK callback', async () => {
      const {screen, dropConferenceParticipant} = renderRoster();
      const customerDropButton = screen.getByRole('button', {name: 'Drop customer +15551234567'});

      fireEvent.click(customerDropButton);

      const dialog = screen.getByTestId('call-control:customer-drop-dialog');
      expect(dialog).toHaveAttribute('open');
      expect(screen.getByRole('heading', {name: 'Drop customer from conference?'})).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));

      expect(dropConferenceParticipant).not.toHaveBeenCalled();
      await waitFor(() => expect(customerDropButton).toHaveFocus());
    });

    it('confirms Customer Drop and supports Escape cancellation', () => {
      const {screen, dropConferenceParticipant} = renderRoster();
      const customerDropButton = screen.getByRole('button', {name: 'Drop customer +15551234567'});

      fireEvent.click(customerDropButton);
      fireEvent.click(screen.getByRole('button', {name: 'Drop'}));
      expect(dropConferenceParticipant).toHaveBeenCalledWith(ownerDropRoster.customer);

      dropConferenceParticipant.mockClear();
      fireEvent.click(customerDropButton);
      const dialog = screen.getByTestId('call-control:customer-drop-dialog');
      fireEvent(dialog, new Event('cancel', {cancelable: true}));
      expect(dropConferenceParticipant).not.toHaveBeenCalled();
    });

    it('globally disables Drop controls and shows loading only on the selected row', () => {
      const {screen} = renderRoster({pendingParticipantDropId: 'agent-2'});

      expect(screen.getByRole('button', {name: 'Drop agent Agent Two'})).toHaveTextContent('Dropping…');
      expect(screen.getByRole('button', {name: 'Drop agent Agent Two'})).toBeDisabled();
      expect(screen.getByRole('button', {name: 'Drop customer +15551234567'})).toBeDisabled();
    });

    it('disables all owner Drop controls during an active non-held consult', () => {
      const {screen} = renderRoster({
        conferenceParticipantDropRoster: {...ownerDropRoster, isDropDisabled: true},
      });

      expect(screen.getByRole('button', {name: 'Drop agent Agent Two'})).toBeDisabled();
      expect(screen.getByRole('button', {name: 'Drop customer +15551234567'})).toBeDisabled();
    });

    it('renders non-owner and Supervisor rows without Drop actions or read-only labels', () => {
      const readOnlyRoster: ConferenceParticipantDropRoster = {
        customer: ownerDropRoster.customer ? {...ownerDropRoster.customer, isReadOnly: true} : null,
        participants: [
          {...ownerDropRoster.participants[0], isPrimary: true, isReadOnly: true},
          {
            participantType: 'Supervisor',
            displayName: 'Supervisor One',
            dropTargetId: 'supervisor-1',
            isPrimary: false,
            isReadOnly: true,
            isDropDisabled: false,
            requiresConfirmation: false,
          },
        ],
        isDropDisabled: false,
      };
      const {screen} = renderRoster({conferenceParticipantDropRoster: readOnlyRoster});

      expect(screen.getByText('Agent Two (Primary)')).toBeInTheDocument();
      expect(screen.getByText('Supervisor One')).toBeInTheDocument();
      expect(screen.queryByText('Read only')).not.toBeInTheDocument();
      expect(document.querySelector('.participant-menu-type')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', {name: /Drop (agent|customer|supervisor)/})).not.toBeInTheDocument();
    });

    it('counts visible non-customer rows and disables a pending EP-DN action', () => {
      const pendingEpDn = {
        participantType: 'EP-DN' as const,
        displayName: '+15551230000',
        dropTargetId: 'pending-epdn',
        isPrimary: false,
        isReadOnly: false,
        isDropDisabled: true,
        requiresConfirmation: false,
      };
      const supervisor = {
        participantType: 'Supervisor' as const,
        displayName: 'Supervisor One',
        dropTargetId: 'supervisor-1',
        isPrimary: false,
        isReadOnly: true,
        isDropDisabled: false,
        requiresConfirmation: false,
      };
      const {screen, dropConferenceParticipant} = renderRoster({
        conferenceParticipantDropRoster: {
          ...ownerDropRoster,
          participants: [...ownerDropRoster.participants, pendingEpDn, supervisor],
        },
      });

      expect(screen.getByTestId('call-control:participants-trigger')).toHaveTextContent('+3 Participants');
      const pendingDrop = screen.getByRole('button', {name: 'Drop ep-dn +15551230000'});
      expect(pendingDrop).toBeDisabled();
      fireEvent.click(pendingDrop);
      expect(dropConferenceParticipant).not.toHaveBeenCalled();
    });

    it('renders an answered Entry Point agent as disabled until conference merge', () => {
      const answeredEntryPointAgent = {
        participantType: 'Agent' as const,
        displayName: 'Support Agent',
        dropTargetId: 'agent-3',
        isPrimary: false,
        isReadOnly: false,
        isDropDisabled: true,
        requiresConfirmation: false,
      };
      const {screen, dropConferenceParticipant} = renderRoster({
        conferenceParticipantDropRoster: {
          customer: null,
          participants: [answeredEntryPointAgent],
          isDropDisabled: false,
        },
      });

      expect(screen.getByTestId('call-control:participants-trigger')).toHaveTextContent('+1 Participant');
      expect(screen.getByText('Support Agent')).toBeInTheDocument();
      const answeredAgentDrop = screen.getByRole('button', {name: 'Drop agent Support Agent'});
      expect(answeredAgentDrop).toBeDisabled();
      fireEvent.click(answeredAgentDrop);
      expect(dropConferenceParticipant).not.toHaveBeenCalled();
    });

    it('keeps generic live feedback mounted when the roster disappears', () => {
      const screen = render(
        <CallControlCADComponent
          {...defaultProps}
          conferenceParticipantDropRoster={null}
          participantDropAnnouncement={{type: 'success', message: 'Participant removed from the conference.'}}
        />
      );

      expect(screen.getByRole('status')).toHaveTextContent('Participant removed from the conference.');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      screen.rerender(
        <CallControlCADComponent
          {...defaultProps}
          conferenceParticipantDropRoster={null}
          participantDropAnnouncement={{type: 'error', message: 'Unable to drop participant from the call. Try again.'}}
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Unable to drop participant from the call. Try again.');
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('conference participants list visibility', () => {
    it('shows participants list when conference is active and other agents are present', () => {
      const screen = render(
        <CallControlCADComponent
          {...defaultProps}
          controls={createEnabledMainTaskUIControls({exitConference: {isVisible: true, isEnabled: true}})}
          conferenceParticipants={[{id: 'agent-2', name: 'Agent Two', pType: 'Agent'}]}
          conferenceParticipantDropRoster={ownerDropRoster}
        />
      );

      expect(screen.getByTestId('call-control:participants-trigger')).toBeInTheDocument();
    });

    it('hides participants list when the validated Drop roster is null', () => {
      const screen = render(
        <CallControlCADComponent
          {...defaultProps}
          controls={createEnabledMainTaskUIControls({exitConference: {isVisible: false, isEnabled: false}})}
          conferenceParticipants={[
            {id: 'agent-2', name: 'Agent Two', pType: 'Agent'},
            {id: 'agent-3', name: 'Agent Three', pType: 'Agent'},
          ]}
          conferenceParticipantDropRoster={null}
        />
      );

      expect(screen.queryByTestId('call-control:participants-trigger')).not.toBeInTheDocument();
    });

    it('shows participants list during nested consult when interaction state is conference', () => {
      const conferenceTask = {
        ...defaultProps.currentTask,
        data: {
          ...defaultProps.currentTask.data,
          isConferenceInProgress: false,
          interaction: {
            ...defaultProps.currentTask.data.interaction,
            state: 'conference',
          },
        },
      };

      const screen = render(
        <CallControlCADComponent
          {...defaultProps}
          currentTask={conferenceTask}
          controls={createEnabledMainTaskUIControls({exitConference: {isVisible: false, isEnabled: false}})}
          conferenceParticipants={[{id: 'agent-2', name: 'Agent Two', pType: 'Agent'}]}
          conferenceParticipantDropRoster={ownerDropRoster}
        />
      );

      expect(screen.getByTestId('call-control:participants-trigger')).toBeInTheDocument();
    });

    it('hides participants list for consult-only secondary agents even when participants exist', () => {
      const consultTask = {
        ...defaultProps.currentTask,
        data: {
          ...defaultProps.currentTask.data,
          isConferenceInProgress: false,
          interaction: {
            ...defaultProps.currentTask.data.interaction,
            state: 'consult',
            interactionId: 'child-interaction-id',
            callProcessingDetails: {
              relationshipType: 'consult',
              parentInteractionId: 'parent-interaction-id',
            },
          },
        },
      };

      const screen = render(
        <CallControlCADComponent
          {...defaultProps}
          currentTask={consultTask}
          controls={createEnabledMainTaskUIControls({exitConference: {isVisible: true, isEnabled: true}})}
          conferenceParticipants={[
            {id: 'agent-2', name: 'Agent Two', pType: 'Agent'},
            {id: 'agent-3', name: 'Agent Three', pType: 'Agent'},
          ]}
        />
      );

      expect(screen.queryByTestId('call-control:participants-trigger')).not.toBeInTheDocument();
    });

    it('hides participants list when conference is active but no other agents are present', () => {
      const screen = render(
        <CallControlCADComponent
          {...defaultProps}
          controls={createEnabledMainTaskUIControls({exitConference: {isVisible: true, isEnabled: true}})}
          conferenceParticipants={[]}
        />
      );

      expect(screen.queryByTestId('call-control:participants-trigger')).not.toBeInTheDocument();
    });
  });
});
