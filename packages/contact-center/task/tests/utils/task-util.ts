import {mockTask} from '@webex/test-fixtures';
import {findHoldTimestamp, getControlsVisibility} from '../../src/Utils/task-util';
import {getIsConferenceInProgress, getConferenceParticipants} from '@webex/cc-store';
import {ITask, TaskData, Interaction} from '@webex/contact-center';
import {DestinationAgentType} from '../../src/Utils/constants';

// Helper function to create properly typed partial task objects for testing
const createMockTask = (data: Partial<TaskData>): ITask => {
  return {
    ...mockTask,
    data: {
      ...mockTask.data,
      ...data,
    } as TaskData,
  };
};

// Helper to create partial interaction data with proper typing
const createPartialInteraction = (interaction: unknown): TaskData['interaction'] => {
  return interaction as TaskData['interaction'];
};
describe('getControlsVisibility', () => {
  it('should show correct controls when station logis is BROWSER, all flags are enabled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };
    // Updating
    const expectedControls = {
      accept: {isVisible: true, isEnabled: true},
      decline: {isVisible: true, isEnabled: true},
      end: {isVisible: true, isEnabled: true},
      muteUnmute: {isVisible: true, isEnabled: true}, // Visible for browser with webRTC enabled
      muteUnmuteConsult: {isVisible: false, isEnabled: true}, // Not visible when no consult in progress
      holdResume: {isVisible: true, isEnabled: true},
      consult: {isVisible: true, isEnabled: true},
      transfer: {isVisible: true, isEnabled: true},
      conference: {isVisible: true, isEnabled: true},
      wrapup: {isVisible: false, isEnabled: true},
      pauseResumeRecording: {isVisible: true, isEnabled: true},
      endConsult: {isVisible: false, isEnabled: true}, // Not visible when no consult in progress
      consultTransfer: {isVisible: false, isEnabled: false}, // Not visible when no consult in progress
      mergeConference: {isVisible: false, isEnabled: false}, // Not visible when no consult in progress
      mergeConferenceConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      consultTransferConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: true},
      exitConference: {isVisible: false, isEnabled: true}, // Not visible when no conference in progress
      recordingIndicator: {isVisible: true, isEnabled: true},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultInitiatedOrAccepted: false,
      isConsultReceived: false,
      isHeld: false,
      consultCallHeld: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask, 'agent1', true)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, webRtcEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: false,
    };

    const expectedControls = {
      accept: {isVisible: false, isEnabled: true},
      decline: {isVisible: false, isEnabled: true},
      end: {isVisible: true, isEnabled: true},
      muteUnmute: {isVisible: false, isEnabled: true},
      muteUnmuteConsult: {isVisible: false, isEnabled: true},
      holdResume: {isVisible: false, isEnabled: true},
      consult: {isVisible: false, isEnabled: true},
      transfer: {isVisible: false, isEnabled: true},
      conference: {isVisible: false, isEnabled: true},
      wrapup: {isVisible: false, isEnabled: true},
      pauseResumeRecording: {isVisible: false, isEnabled: true},
      endConsult: {isVisible: false, isEnabled: true},
      consultTransfer: {isVisible: false, isEnabled: false},
      mergeConference: {isVisible: false, isEnabled: false},
      mergeConferenceConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      consultTransferConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: true},
      exitConference: {isVisible: false, isEnabled: true},
      recordingIndicator: {isVisible: true, isEnabled: true},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultInitiatedOrAccepted: false,
      isConsultReceived: false,
      isHeld: false,
      consultCallHeld: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask, 'agent1', true)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, isEndCallEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: false,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const expectedControls = {
      accept: {isVisible: true, isEnabled: true},
      decline: {isVisible: true, isEnabled: true},
      end: {isVisible: true, isEnabled: true},
      muteUnmute: {isVisible: true, isEnabled: true}, // Visible for browser with webRTC enabled
      muteUnmuteConsult: {isVisible: false, isEnabled: true}, // Not visible when no consult in progress
      holdResume: {isVisible: true, isEnabled: true},
      consult: {isVisible: true, isEnabled: true},
      transfer: {isVisible: true, isEnabled: true},
      conference: {isVisible: true, isEnabled: true},
      wrapup: {isVisible: false, isEnabled: true},
      pauseResumeRecording: {isVisible: true, isEnabled: true},
      endConsult: {isVisible: false, isEnabled: true}, // Not visible when no consult in progress
      consultTransfer: {isVisible: false, isEnabled: false}, // Not visible when no consult in progress
      mergeConference: {isVisible: false, isEnabled: false}, // Not visible when no consult in progress
      mergeConferenceConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      consultTransferConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: true},
      exitConference: {isVisible: false, isEnabled: true}, // Not visible when no conference in progress
      recordingIndicator: {isVisible: true, isEnabled: true},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultInitiatedOrAccepted: false,
      isConsultReceived: false,
      isHeld: false,
      consultCallHeld: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask, 'agent1', true)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, isEndConsultEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: false,
      webRtcEnabled: true,
    };

    const task = mockTask;
    task.data.interaction = {
      ...task.data.interaction,
      mediaType: 'telephony',
    };

    const expectedControls = {
      accept: {isVisible: true, isEnabled: true},
      decline: {isVisible: true, isEnabled: true},
      end: {isVisible: true, isEnabled: true},
      muteUnmute: {isVisible: true, isEnabled: true}, // Visible for browser with webRTC enabled
      muteUnmuteConsult: {isVisible: false, isEnabled: true}, // Not visible when no consult in progress
      holdResume: {isVisible: true, isEnabled: true},
      consult: {isVisible: true, isEnabled: true},
      transfer: {isVisible: true, isEnabled: true},
      conference: {isVisible: true, isEnabled: true},
      wrapup: {isVisible: false, isEnabled: true},
      pauseResumeRecording: {isVisible: true, isEnabled: true},
      endConsult: {isVisible: false, isEnabled: true}, // Not visible when isEndConsultEnabled is false
      consultTransfer: {isVisible: false, isEnabled: false}, // Not visible when no consult in progress
      mergeConference: {isVisible: false, isEnabled: false}, // Not visible when no consult in progress
      mergeConferenceConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      consultTransferConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: true},
      exitConference: {isVisible: false, isEnabled: true}, // Not visible when no conference in progress
      recordingIndicator: {isVisible: true, isEnabled: true},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultInitiatedOrAccepted: false,
      isConsultReceived: false,
      isHeld: false,
      consultCallHeld: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task, 'agent1', true)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is AGENT_DN, all flags are enabled and media type is telehphony', () => {
    const deviceType = 'AGENT_DN';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const expectedControls = {
      accept: {isVisible: false, isEnabled: true},
      decline: {isVisible: false, isEnabled: true},
      end: {isVisible: true, isEnabled: true},
      muteUnmute: {isVisible: false, isEnabled: true},
      muteUnmuteConsult: {isVisible: false, isEnabled: true},
      holdResume: {isVisible: true, isEnabled: true},
      consult: {isVisible: true, isEnabled: true},
      transfer: {isVisible: true, isEnabled: true},
      conference: {isVisible: false, isEnabled: true},
      wrapup: {isVisible: false, isEnabled: true},
      pauseResumeRecording: {isVisible: true, isEnabled: true},
      endConsult: {isVisible: false, isEnabled: true}, // Not visible when no consult in progress
      consultTransfer: {isVisible: false, isEnabled: false}, // Not visible when no consult in progress
      mergeConference: {isVisible: false, isEnabled: false}, // Not visible when no consult in progress
      mergeConferenceConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      consultTransferConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: true},
      exitConference: {isVisible: false, isEnabled: true}, // Not visible when no conference in progress
      recordingIndicator: {isVisible: true, isEnabled: true},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultInitiatedOrAccepted: false,
      isConsultReceived: false,
      isHeld: false,
      consultCallHeld: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask, 'agent1', true)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is EXTENSION, all flags are enabled and media type is telehphony', () => {
    const deviceType = 'EXTENSION';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const task = mockTask;
    task.data.interaction.mediaType = 'telephony';

    const expectedControls = {
      accept: {isVisible: false, isEnabled: true},
      decline: {isVisible: false, isEnabled: true},
      end: {isVisible: true, isEnabled: true},
      muteUnmute: {isVisible: false, isEnabled: true},
      muteUnmuteConsult: {isVisible: false, isEnabled: true},
      holdResume: {isVisible: true, isEnabled: true},
      consult: {isVisible: true, isEnabled: true},
      transfer: {isVisible: true, isEnabled: true},
      conference: {isVisible: false, isEnabled: true},
      wrapup: {isVisible: false, isEnabled: true},
      pauseResumeRecording: {isVisible: true, isEnabled: true},
      endConsult: {isVisible: false, isEnabled: true}, // Not visible when no consult in progress
      consultTransfer: {isVisible: false, isEnabled: false}, // Not visible when no consult in progress
      mergeConference: {isVisible: false, isEnabled: false}, // Not visible when no consult in progress
      mergeConferenceConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      consultTransferConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: true},
      exitConference: {isVisible: false, isEnabled: true}, // Not visible when no conference in progress
      recordingIndicator: {isVisible: true, isEnabled: true},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultInitiatedOrAccepted: false,
      isConsultReceived: false,
      isHeld: false,
      consultCallHeld: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task, 'agent1', true)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is EXTENSION, all flags are enabled and media type is chat', () => {
    const deviceType = 'EXTENSION';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const task = mockTask;
    task.data.interaction.mediaType = 'chat';

    const expectedControls = {
      accept: {isVisible: true, isEnabled: true},
      decline: {isVisible: false, isEnabled: true},
      end: {isVisible: true, isEnabled: true},
      muteUnmute: {isVisible: false, isEnabled: true},
      muteUnmuteConsult: {isVisible: false, isEnabled: true},
      holdResume: {isVisible: false, isEnabled: true},
      consult: {isVisible: false, isEnabled: true},
      transfer: {isVisible: true, isEnabled: true},
      conference: {isVisible: true, isEnabled: true},
      wrapup: {isVisible: false, isEnabled: true},
      pauseResumeRecording: {isVisible: false, isEnabled: true},
      endConsult: {isVisible: false, isEnabled: true},
      consultTransfer: {isVisible: false, isEnabled: false},
      mergeConference: {isVisible: false, isEnabled: false},
      mergeConferenceConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      consultTransferConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: true},
      exitConference: {isVisible: false, isEnabled: true},
      recordingIndicator: {isVisible: false, isEnabled: true},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultInitiatedOrAccepted: false,
      isConsultReceived: false,
      isHeld: false,
      consultCallHeld: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task, 'agent1', true)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, all flags are enabled and media type is email', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const task = mockTask;
    task.data.interaction.mediaType = 'email';

    const expectedControls = {
      accept: {isVisible: true, isEnabled: true},
      decline: {isVisible: false, isEnabled: true},
      end: {isVisible: true, isEnabled: true},
      muteUnmute: {isVisible: false, isEnabled: true},
      muteUnmuteConsult: {isVisible: false, isEnabled: true},
      holdResume: {isVisible: false, isEnabled: true},
      consult: {isVisible: false, isEnabled: true},
      transfer: {isVisible: true, isEnabled: true},
      conference: {isVisible: false, isEnabled: true},
      wrapup: {isVisible: false, isEnabled: true},
      pauseResumeRecording: {isVisible: false, isEnabled: true},
      endConsult: {isVisible: false, isEnabled: true},
      consultTransfer: {isVisible: false, isEnabled: false},
      mergeConference: {isVisible: false, isEnabled: false},
      mergeConferenceConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      consultTransferConsult: {isVisible: false, isEnabled: false}, // Not enabled when consult not accepted
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: true},
      exitConference: {isVisible: false, isEnabled: true},
      recordingIndicator: {isVisible: false, isEnabled: true},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultInitiatedOrAccepted: false,
      isConsultReceived: false,
      isHeld: false,
      consultCallHeld: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task, 'agent1', true)).toEqual(expectedControls);
  });

  it('should handle errors when accessing featureFlags and return safe defaults', () => {
    const logger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
    };
    const deviceType = 'BROWSER';
    // Create problematic featureFlags that throw when accessing properties
    const problematicFeatureFlags = new Proxy(
      {},
      {
        get: () => {
          throw new Error('FeatureFlags access error');
        },
      }
    );

    const result = getControlsVisibility(deviceType, problematicFeatureFlags, mockTask, 'agent1', false, logger);

    expect(logger.error).toHaveBeenCalledWith(
      'CC-Widgets: Task: Error in getControlsVisibility - FeatureFlags access error',
      {
        module: 'task-util',
        method: 'getControlsVisibility',
      }
    );

    expect(result).toEqual({
      accept: {isVisible: false, isEnabled: false},
      decline: {isVisible: false, isEnabled: false},
      end: {isVisible: false, isEnabled: false},
      muteUnmute: {isVisible: false, isEnabled: false},
      muteUnmuteConsult: {isVisible: false, isEnabled: false},
      holdResume: {isVisible: false, isEnabled: false},
      consult: {isVisible: false, isEnabled: false},
      transfer: {isVisible: false, isEnabled: false},
      conference: {isVisible: false, isEnabled: false},
      wrapup: {isVisible: false, isEnabled: true},
      pauseResumeRecording: {isVisible: false, isEnabled: false},
      endConsult: {isVisible: false, isEnabled: false},
      consultTransfer: {isVisible: false, isEnabled: false},
      mergeConference: {isVisible: false, isEnabled: false},
      mergeConferenceConsult: {isVisible: false, isEnabled: false},
      consultTransferConsult: {isVisible: false, isEnabled: false},
      switchToMainCall: {isVisible: false, isEnabled: false},
      switchToConsult: {isVisible: false, isEnabled: false},
      exitConference: {isVisible: false, isEnabled: false},
      recordingIndicator: {isVisible: false, isEnabled: false},
      isConferenceInProgress: false,
      isConsultInitiated: false,
      isConsultInitiatedAndAccepted: false,
      isConsultInitiatedOrAccepted: false,
      isConsultReceived: false,
      isHeld: false,
      consultCallHeld: false,
    });
  });

  it('should enable end button when in conference and switched back from consult (consultCallHeld = true)', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    // Mock a task with conference in progress and consult call held
    const task = createMockTask({
      isConferenceInProgress: true,
      consultMediaResourceId: 'consult',
      interaction: createPartialInteraction({
        mediaType: 'telephony',
        state: 'conferencing', // Conference state
        media: {
          main: {
            mediaResourceId: 'main',
            mType: 'mainCall',
            isHold: false,
            participants: ['agent1', 'agent2', 'customer1'],
          },
          consult: {
            mediaResourceId: 'consult',
            mType: 'consult',
            isHold: true, // Consult is on hold - we've switched back to main
            participants: ['agent1', 'agent3'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            consultState: 'Conferencing',
            isConsulted: false,
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            name: 'Agent Two',
            hasLeft: false,
          },
          agent3: {
            id: 'agent3',
            pType: 'Agent',
            name: 'Agent Three',
            hasLeft: false,
          },
          customer1: {
            id: 'customer1',
            pType: 'Customer',
            name: 'Customer',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getControlsVisibility(deviceType, featureFlags, task, 'agent1', true);

    // End button should be enabled when switched back to main call from consult
    expect(result.end.isEnabled).toBe(true);
    expect(result.end.isVisible).toBe(true);
  });

  it('should enable end button when in regular consult and switched back to main call (consultCallHeld = true)', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    // Mock a task with consult (not conference) and consult call held
    const task = createMockTask({
      isConferenceInProgress: false,
      consultMediaResourceId: 'consult',
      interaction: createPartialInteraction({
        mediaType: 'telephony',
        state: 'consulting', // Consult state
        media: {
          main: {
            mediaResourceId: 'main',
            mType: 'mainCall',
            isHold: false,
            participants: ['agent1', 'customer1'],
          },
          consult: {
            mediaResourceId: 'consult',
            mType: 'consult',
            isHold: true, // Consult is on hold - we've switched back to main
            participants: ['agent1', 'agent2'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            consultState: 'Initiated',
            isConsulted: false,
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            name: 'Agent Two',
            hasLeft: false,
          },
          customer1: {
            id: 'customer1',
            pType: 'Customer',
            name: 'Customer',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getControlsVisibility(deviceType, featureFlags, task, 'agent1', false);

    // End button should be enabled when switched back to main call from consult
    expect(result.end.isEnabled).toBe(true);
    expect(result.end.isVisible).toBe(true);
  });

  it('should disable end button when consult is active (not on hold)', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    // Mock a task with active consult (not on hold)
    const task = createMockTask({
      isConferenceInProgress: false,
      consultMediaResourceId: 'consult',
      interaction: createPartialInteraction({
        mediaType: 'telephony',
        state: 'consulting', // Active consult state
        media: {
          main: {
            mediaResourceId: 'main',
            mType: 'mainCall',
            isHold: true, // Main is on hold - we're on consult call
            participants: ['agent1', 'customer1'],
          },
          consult: {
            mediaResourceId: 'consult',
            mType: 'consult',
            isHold: false, // Consult is active
            participants: ['agent1', 'agent2'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            consultState: 'Initiated', // Indicate consult was initiated
            isConsulted: false,
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            name: 'Agent Two',
            isConsulted: false,
            hasLeft: false,
          },
          customer1: {
            id: 'customer1',
            pType: 'Customer',
            name: 'Customer',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getControlsVisibility(deviceType, featureFlags, task, 'agent1', false);

    // End button should be disabled when on active consult call
    expect(result.end.isEnabled).toBe(false);
    expect(result.end.isVisible).toBe(true);
  });
});

describe('getEndButtonVisibility - EP_DN consult scenarios', () => {
  const deviceType = 'BROWSER';
  const featureFlags = {
    isEndCallEnabled: true,
    isEndConsultEnabled: true,
    webRtcEnabled: true,
  };

  it('should enable end button during EP_DN consult when main call is active (not held)', () => {
    // Mock a task with EP_DN consult - switching back to main call (consult on hold)
    const task = createMockTask({
      consultMediaResourceId: 'consult',
      interaction: createPartialInteraction({
        mediaType: 'telephony',
        destAgentType: DestinationAgentType.EP_DN,
        state: 'consulting',
        media: {
          main: {
            mediaResourceId: 'main',
            mType: 'mainCall',
            isHold: false, // Main call is active - switched back to main
            participants: ['agent1', 'customer1'],
          },
          consult: {
            mediaResourceId: 'consult',
            mType: 'consult',
            isHold: true, // Consult is on hold - we're on main call
            participants: ['agent1', 'epdn-agent'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            consultState: 'Initiated',
            isConsulted: false,
            hasLeft: false,
          },
          customer1: {
            id: 'customer1',
            pType: 'Customer',
            name: 'Customer',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getControlsVisibility(deviceType, featureFlags, task, 'agent1', false);

    // EP_DN consult: End button should be enabled when on main call
    expect(result.end.isVisible).toBe(true);
    expect(result.end.isEnabled).toBe(true);
  });

  it('should disable end button during EP_DN consult when switched to EP_DN agent (main call held)', () => {
    // Mock a task with EP_DN consult - switched to EP_DN agent (main call on hold)
    const task = createMockTask({
      consultMediaResourceId: 'consult',
      interaction: createPartialInteraction({
        mediaType: 'telephony',
        destAgentType: DestinationAgentType.EPDN,
        state: 'consulting',
        media: {
          main: {
            mediaResourceId: 'main',
            mType: 'mainCall',
            isHold: true, // Main call is held - switched to EP_DN consult
            participants: ['agent1', 'customer1'],
          },
          consult: {
            mediaResourceId: 'consult',
            mType: 'consult',
            isHold: false, // Consult is active - talking to EP_DN
            participants: ['agent1', 'epdn-agent'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            consultState: 'Initiated',
            isConsulted: false,
            hasLeft: false,
          },
          customer1: {
            id: 'customer1',
            pType: 'Customer',
            name: 'Customer',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getControlsVisibility(deviceType, featureFlags, task, 'agent1', false);

    // EP_DN consult: End button should be disabled when main call is held (talking to EP_DN)
    expect(result.end.isVisible).toBe(true);
    expect(result.end.isEnabled).toBe(false);
  });

  it('should enable end button during EP_DN consult conference when main call is held but conference in progress', () => {
    // Mock a task with EP_DN consult in conference state
    const task = createMockTask({
      isConferenceInProgress: true,
      consultMediaResourceId: 'consult',
      interaction: createPartialInteraction({
        mediaType: 'telephony',
        destAgentType: DestinationAgentType.ENTRY_POINT,
        state: 'conferencing',
        media: {
          main: {
            mediaResourceId: 'main',
            mType: 'mainCall',
            isHold: true, // Main call is held during conference
            participants: ['agent1', 'customer1', 'epdn-agent'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            consultState: 'Conferencing',
            isConsulted: false,
            hasLeft: false,
          },
          customer1: {
            id: 'customer1',
            pType: 'Customer',
            name: 'Customer',
            hasLeft: false,
          },
          'epdn-agent': {
            id: 'epdn-agent',
            pType: 'Agent',
            name: 'EP DN Agent',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getControlsVisibility(deviceType, featureFlags, task, 'agent1', true);

    expect(result.end.isVisible).toBe(true);
    expect(result.end.isEnabled).toBe(true);
  });

  it('should recognize EP destAgentType variant', () => {
    const task = createMockTask({
      consultMediaResourceId: 'consult',
      interaction: createPartialInteraction({
        destAgentType: DestinationAgentType.EP,
        mediaType: 'telephony',
        state: 'consulting',
        media: {
          main: {
            mediaResourceId: 'main',
            mType: 'mainCall',
            isHold: false, // Main call active - we're on main call
            participants: ['agent1', 'customer1'],
          },
          consult: {
            mediaResourceId: 'consult',
            mType: 'consult',
            isHold: true, // Consult on hold
            participants: ['agent1', 'ep-agent'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            consultState: 'Initiated',
            isConsulted: false,
            hasLeft: false,
          },
          customer1: {
            id: 'customer1',
            pType: 'Customer',
            name: 'Customer',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getControlsVisibility(deviceType, featureFlags, task, 'agent1', false);

    // EP_DN consult: End button should be enabled when on main call
    expect(result.end.isVisible).toBe(true);
    expect(result.end.isEnabled).toBe(true);
  });

  it('should handle missing destAgentType as non-EP_DN consult', () => {
    const task = createMockTask({
      consultMediaResourceId: 'consult',
      interaction: createPartialInteraction({
        mediaType: 'telephony',
        state: 'consulting',
        media: {
          main: {
            mediaResourceId: 'main',
            mType: 'mainCall',
            isHold: true,
            participants: ['agent1', 'customer1'],
          },
          consult: {
            mediaResourceId: 'consult',
            mType: 'consult',
            isHold: false,
            participants: ['agent1', 'agent2'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            consultState: 'Initiated',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getControlsVisibility(deviceType, featureFlags, task, 'agent1', false);

    // Should follow regular consult logic (disabled when on consult call)
    expect(result.end.isVisible).toBe(true);
    expect(result.end.isEnabled).toBe(false);
  });

  it('should handle missing task data gracefully', () => {
    const task = {} as Partial<ITask> as ITask;

    const result = getControlsVisibility(deviceType, featureFlags, task, 'agent1', false);

    // Should still return valid visibility structure
    expect(result.end).toBeDefined();
    expect(result.end.isVisible).toBeDefined();
    expect(result.end.isEnabled).toBeDefined();
  });

  it('should handle missing interaction data gracefully', () => {
    const task = createMockTask({
      interaction: undefined,
    });

    const result = getControlsVisibility(deviceType, featureFlags, task, 'agent1', false);

    expect(result.end).toBeDefined();
    expect(result.end.isVisible).toBeDefined();
    expect(result.end.isEnabled).toBeDefined();
  });
});

describe('findHoldTimestamp', () => {
  it('returns the holdTimestamp for the correct mType', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 123456},
        aux: {mType: 'auxCall', holdTimestamp: 654321},
      },
    } as unknown as Interaction;
    expect(findHoldTimestamp(interaction, 'mainCall')).toBe(123456);
    expect(findHoldTimestamp(interaction, 'auxCall')).toBe(654321);
  });

  it('returns null if mType is not found', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 123456},
      },
    } as unknown as Interaction;
    expect(findHoldTimestamp(interaction, 'otherCall')).toBeNull();
  });

  it('returns null if holdTimestamp is missing', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall'},
      },
    } as unknown as Interaction;
    expect(findHoldTimestamp(interaction, 'mainCall')).toBeNull();
  });

  it('returns null if media is missing', () => {
    const interaction = {} as unknown as Interaction;
    expect(findHoldTimestamp(interaction, 'mainCall')).toBeNull();
  });

  it('returns 0 if holdTimestamp is 0', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 0},
      },
    } as unknown as Interaction;
    expect(findHoldTimestamp(interaction, 'mainCall')).toBe(0);
  });

  it('works with extra unknown properties', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 42, foo: 'bar'},
      },
      extra: 123,
    } as unknown as Interaction;
    expect(findHoldTimestamp(interaction, 'mainCall')).toBe(42);
  });
});

describe('getIsConferenceInProgress', () => {
  it('should return false when task data is missing', () => {
    const task = {} as Partial<ITask> as ITask;
    expect(getIsConferenceInProgress(task)).toBe(false);
  });

  it('should return false when interaction media is missing', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({}),
    });
    expect(getIsConferenceInProgress(task)).toBe(false);
  });

  it('should return false when interactionId is missing', () => {
    const task = createMockTask({
      interaction: createPartialInteraction({
        media: {},
      }),
    });
    expect(getIsConferenceInProgress(task)).toBe(false);
  });

  it('should return false when there are no participants', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: [],
          },
        },
        participants: {},
      }),
    });
    expect(getIsConferenceInProgress(task)).toBe(false);
  });

  it('should return false when there is only one agent participant', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            hasLeft: false,
          },
        },
      }),
    });
    expect(getIsConferenceInProgress(task)).toBe(false);
  });

  it('should return true when there are two or more agent participants', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'agent2'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            hasLeft: false,
          },
        },
      }),
    });
    expect(getIsConferenceInProgress(task)).toBe(true);
  });

  it('should exclude customer participants from agent count', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'customer1'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            hasLeft: false,
          },
          customer1: {
            id: 'customer1',
            pType: 'Customer',
            hasLeft: false,
          },
        },
      }),
    });
    expect(getIsConferenceInProgress(task)).toBe(false);
  });

  it('should exclude supervisor participants from agent count', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'supervisor1'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            hasLeft: false,
          },
          supervisor1: {
            id: 'supervisor1',
            pType: 'Supervisor',
            hasLeft: false,
          },
        },
      }),
    });
    expect(getIsConferenceInProgress(task)).toBe(false);
  });

  it('should exclude VVA participants from agent count', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'vva1'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            hasLeft: false,
          },
          vva1: {
            id: 'vva1',
            pType: 'VVA',
            hasLeft: false,
          },
        },
      }),
    });
    expect(getIsConferenceInProgress(task)).toBe(false);
  });

  it('should exclude participants who have left from agent count', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'agent2'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            hasLeft: true,
          },
        },
      }),
    });
    expect(getIsConferenceInProgress(task)).toBe(false);
  });
});

describe('getConferenceParticipants', () => {
  const currentAgentId = 'agent1';

  it('should return empty array when task data is missing', () => {
    const task = {} as Partial<ITask> as ITask;
    expect(getConferenceParticipants(task, currentAgentId)).toEqual([]);
  });

  it('should return empty array when interaction media is missing', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({}),
    });
    expect(getConferenceParticipants(task, currentAgentId)).toEqual([]);
  });

  it('should return empty array when interactionId is missing', () => {
    const task = createMockTask({
      interaction: createPartialInteraction({
        media: {},
      }),
    });
    expect(getConferenceParticipants(task, currentAgentId)).toEqual([]);
  });

  it('should return empty array when there are no participants', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: [],
          },
        },
        participants: {},
      }),
    });
    expect(getConferenceParticipants(task, currentAgentId)).toEqual([]);
  });

  it('should return list of agent participants excluding current agent', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'agent2', 'agent3'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            name: 'Agent Two',
            hasLeft: false,
          },
          agent3: {
            id: 'agent3',
            pType: 'Agent',
            name: 'Agent Three',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getConferenceParticipants(task, currentAgentId);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      id: 'agent2',
      pType: 'Agent',
      name: 'Agent Two',
    });
    expect(result).toContainEqual({
      id: 'agent3',
      pType: 'Agent',
      name: 'Agent Three',
    });
    expect(result).not.toContainEqual(
      expect.objectContaining({
        id: 'agent1',
      })
    );
  });

  it('should exclude customer participants', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'agent2', 'customer1'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            name: 'Agent Two',
            hasLeft: false,
          },
          customer1: {
            id: 'customer1',
            pType: 'Customer',
            name: 'Customer One',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getConferenceParticipants(task, currentAgentId);

    expect(result).toHaveLength(1);
    expect(result).toContainEqual({
      id: 'agent2',
      pType: 'Agent',
      name: 'Agent Two',
    });
  });

  it('should exclude supervisor participants', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'agent2', 'supervisor1'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            name: 'Agent Two',
            hasLeft: false,
          },
          supervisor1: {
            id: 'supervisor1',
            pType: 'Supervisor',
            name: 'Supervisor One',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getConferenceParticipants(task, currentAgentId);

    expect(result).toHaveLength(1);
    expect(result).toContainEqual({
      id: 'agent2',
      pType: 'Agent',
      name: 'Agent Two',
    });
  });

  it('should exclude VVA participants', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'agent2', 'vva1'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            name: 'Agent Two',
            hasLeft: false,
          },
          vva1: {
            id: 'vva1',
            pType: 'VVA',
            name: 'VVA One',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getConferenceParticipants(task, currentAgentId);

    expect(result).toHaveLength(1);
    expect(result).toContainEqual({
      id: 'agent2',
      pType: 'Agent',
      name: 'Agent Two',
    });
  });

  it('should exclude participants who have left', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'agent2', 'agent3'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            name: 'Agent One',
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            name: 'Agent Two',
            hasLeft: false,
          },
          agent3: {
            id: 'agent3',
            pType: 'Agent',
            name: 'Agent Three',
            hasLeft: true,
          },
        },
      }),
    });

    const result = getConferenceParticipants(task, currentAgentId);

    expect(result).toHaveLength(1);
    expect(result).toContainEqual({
      id: 'agent2',
      pType: 'Agent',
      name: 'Agent Two',
    });
  });

  it('should handle participants without names', () => {
    const task = createMockTask({
      interactionId: 'main',
      interaction: createPartialInteraction({
        media: {
          main: {
            participants: ['agent1', 'agent2'],
          },
        },
        participants: {
          agent1: {
            id: 'agent1',
            pType: 'Agent',
            hasLeft: false,
          },
          agent2: {
            id: 'agent2',
            pType: 'Agent',
            hasLeft: false,
          },
        },
      }),
    });

    const result = getConferenceParticipants(task, currentAgentId);

    expect(result).toHaveLength(1);
    expect(result).toContainEqual({
      id: 'agent2',
      pType: 'Agent',
      name: 'agent2',
    });
  });
});
