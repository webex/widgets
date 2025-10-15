import {mockTask} from '@webex/test-fixtures';
import {
  findHoldTimestamp,
  getControlsVisibility,
  getIsConferenceInProgress,
  getConferenceParticipants,
} from '../../src/Utils/task-util';
import {ITask, TaskData} from '@webex/contact-center';

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
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, webRtcEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: false,
    };

    const expectedControls = {
      accept: false,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: false,
      consult: false,
      transfer: false,
      conference: false,
      wrapup: false,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: true,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is BROWSER, isEndCallEnabled is disbaled and media type is telehphony', () => {
    const deviceType = 'BROWSER';
    const featureFlags = {
      isEndCallEnabled: false,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const expectedControls = {
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
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask)).toEqual(expectedControls);
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
      endConsult: false,
      recordingIndicator: true,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
  });

  it('should show correct controls when station logis is AGENT_DN, all flags are enabled and media type is telehphony', () => {
    const deviceType = 'AGENT_DN';
    const featureFlags = {
      isEndCallEnabled: true,
      isEndConsultEnabled: true,
      webRtcEnabled: true,
    };

    const expectedControls = {
      accept: false,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: true,
      consult: true,
      transfer: true,
      conference: false,
      wrapup: false,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, mockTask)).toEqual(expectedControls);
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
      accept: false,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: true,
      consult: true,
      transfer: true,
      conference: false,
      wrapup: false,
      pauseResumeRecording: true,
      endConsult: true,
      recordingIndicator: true,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
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
      accept: true,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: false,
      consult: false,
      transfer: true,
      conference: true,
      wrapup: false,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: false,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
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
      accept: true,
      decline: false,
      end: true,
      muteUnmute: false,
      holdResume: false,
      consult: false,
      transfer: true,
      conference: false,
      wrapup: false,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: false,
      isConferenceInProgress: false,
    };

    expect(getControlsVisibility(deviceType, featureFlags, task)).toEqual(expectedControls);
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

    const result = getControlsVisibility(deviceType, problematicFeatureFlags, mockTask, logger);

    expect(logger.error).toHaveBeenCalledWith(
      'CC-Widgets: Task: Error in getControlsVisibility - FeatureFlags access error',
      {
        module: 'task-util',
        method: 'getControlsVisibility',
      }
    );

    expect(result).toEqual({
      accept: false,
      decline: false,
      end: false,
      muteUnmute: false,
      holdResume: false,
      consult: false,
      transfer: false,
      conference: false,
      wrapup: false,
      pauseResumeRecording: false,
      endConsult: false,
      recordingIndicator: false,
      isConferenceInProgress: false,
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
    };
    expect(findHoldTimestamp(interaction, 'mainCall')).toBe(123456);
    expect(findHoldTimestamp(interaction, 'auxCall')).toBe(654321);
  });

  it('returns null if mType is not found', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 123456},
      },
    };
    expect(findHoldTimestamp(interaction, 'otherCall')).toBeNull();
  });

  it('returns null if holdTimestamp is missing', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall'},
      },
    };
    expect(findHoldTimestamp(interaction, 'mainCall')).toBeNull();
  });

  it('returns null if media is missing', () => {
    const interaction = {};
    expect(findHoldTimestamp(interaction, 'mainCall')).toBeNull();
  });

  it('returns 0 if holdTimestamp is 0', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 0},
      },
    };
    expect(findHoldTimestamp(interaction, 'mainCall')).toBe(0);
  });

  it('works with extra unknown properties', () => {
    const interaction = {
      media: {
        main: {mType: 'mainCall', holdTimestamp: 42, foo: 'bar'},
      },
      extra: 123,
    };
    expect(findHoldTimestamp(interaction, 'mainCall')).toBe(42);
  });

  it('should handle errors when accessing interaction media and return null', () => {
    const logger = {
      error: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      trace: jest.fn(),
    };
    // Create a problematic interaction that throws when accessing media
    const problematicInteraction = new Proxy(
      {},
      {
        get: (target, prop) => {
          if (prop === 'media') {
            throw new Error('Media access error');
          }
          return target[prop];
        },
      }
    );

    const result = findHoldTimestamp(problematicInteraction, 'mainCall', logger);

    expect(logger.error).toHaveBeenCalledWith('CC-Widgets: Task: Error in findHoldTimestamp - Media access error', {
      module: 'task-util',
      method: 'findHoldTimestamp',
    });

    expect(result).toBeNull();
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
      name: undefined,
    });
  });
});
