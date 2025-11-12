import {mockTask} from '@webex/test-fixtures';
import {findHoldTimestamp, getControlsVisibility} from '../../src/Utils/task-util';
import {getIsConferenceInProgress, getConferenceParticipants} from '@webex/cc-store';
import {ITask, TaskData, Interaction} from '@webex/contact-center';

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
