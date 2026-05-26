import {isIncomingTask, getConferenceParticipants, findHoldTimestamp} from '../src/task-utils';
import {mockTask} from '../../test-fixtures/src/fixtures';
import {ITask} from '../src/store.types';

const participant = (hasJoined: boolean) =>
  ({
    id: 'agent1',
    pType: 'Agent',
    type: 'agent',
    hasJoined,
    hasLeft: false,
    isInPredial: false,
  }) as ITask['data']['interaction']['participants'][string];

describe('isIncomingTask', () => {
  let testTask: ITask;

  beforeEach(() => {
    // Reset task to base mock state before each test
    testTask = JSON.parse(JSON.stringify(mockTask));
  });

  describe('when task is incoming', () => {
    it('should return true for valid states without wrapup and agent has not joined', () => {
      const validStates = ['new', 'consult', 'connected'];

      validStates.forEach((state) => {
        testTask.data = {
          ...testTask.data,
          wrapUpRequired: false,
          agentId: 'agent1',
          interaction: {
            ...testTask.data.interaction,
            state: state as string,
            participants: {
              agent1: participant(false),
            },
          },
        };

        const result = isIncomingTask(testTask, 'agent1');
        expect(result).toBe(true);
      });
    });

    it('should return true when participants or agentId is undefined', () => {
      // Test with undefined participants
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: 'agent1',
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: undefined,
        },
      };
      expect(isIncomingTask(testTask, 'agent1')).toBe(true);

      // Test with undefined agentId
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: undefined as unknown as string,
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: {agent1: participant(false)},
        },
      };
      expect(isIncomingTask(testTask, undefined as unknown as string)).toBe(true);
    });
  });

  describe('when task is not incoming', () => {
    it('should return false when wrapUpRequired is true or agent has joined', () => {
      // Test wrapUpRequired = true
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: true,
        agentId: 'agent1',
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: {agent1: participant(false)},
        },
      };
      expect(isIncomingTask(testTask, 'agent1')).toBe(false);

      // Test agent has already joined
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: 'agent1',
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: {agent1: participant(true)},
        },
      };
      expect(isIncomingTask(testTask, 'agent1')).toBe(false);
    });

    it('should return false for invalid task states', () => {
      const invalidStates = ['active', 'held', 'ended', 'wrapUp', 'conferencing'];

      invalidStates.forEach((state) => {
        testTask.data = {
          ...testTask.data,
          wrapUpRequired: false,
          agentId: 'agent1',
          interaction: {
            ...testTask.data.interaction,
            state: state as string,
            participants: {agent1: participant(false)},
          },
        };
        expect(isIncomingTask(testTask, 'agent1')).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle invalid task data gracefully', () => {
      // Null/undefined tasks
      expect(isIncomingTask(null as unknown as ITask, 'agent1')).toBe(false);
      expect(isIncomingTask(undefined as unknown as ITask, 'agent1')).toBe(false);
      expect(isIncomingTask({} as ITask, 'agent1')).toBe(false);
      expect(isIncomingTask({data: null} as unknown as ITask, 'agent1')).toBe(false);

      // Missing interaction
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: 'agent1',
        interaction: undefined,
      } as unknown as ITask['data'];
      expect(isIncomingTask(testTask, 'agent1')).toBe(false);
    });

    it('should handle participant edge cases correctly', () => {
      // Empty participants object
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: 'agent1',
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: {},
        },
      };
      expect(isIncomingTask(testTask, 'agent1')).toBe(true);

      // Agent not found in participants
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: 'agent1',
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: {agent2: participant(true)},
        },
      };
      expect(isIncomingTask(testTask, 'agent1')).toBe(true);

      // Multiple agents with different join states - only current agent matters
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: 'agent1',
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: {
            agent1: participant(false), // Current agent hasn't joined
            agent2: participant(true), // Other agent has joined
          },
        },
      };
      expect(isIncomingTask(testTask, 'agent1')).toBe(true);
    });
  });
});

// Helper function to create properly typed partial task objects for testing
const createMockTask = (data: Partial<ITask['data']>): ITask => {
  return {
    ...mockTask,
    data: {
      ...mockTask.data,
      ...data,
    } as ITask['data'],
  };
};

// Helper to create partial interaction data with proper typing
const createPartialInteraction = (interaction: unknown): ITask['data']['interaction'] => {
  return interaction as ITask['data']['interaction'];
};

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

  it('should handle participants without names by using participant ID', () => {
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

describe('findHoldTimestamp', () => {
  it('should return null when task data is missing or undefined', () => {
    const task = {} as Partial<ITask> as ITask;
    expect(findHoldTimestamp(task, 'mainCall')).toBeNull();
  });

  it('should return null when interaction is missing', () => {
    const task = createMockTask({
      interaction: undefined as unknown as ITask['data']['interaction'],
    });
    expect(findHoldTimestamp(task, 'mainCall')).toBeNull();
  });

  it('should return null when interaction.media is missing', () => {
    const task = createMockTask({
      interaction: createPartialInteraction({
        media: undefined,
      }),
    });
    expect(findHoldTimestamp(task, 'mainCall')).toBeNull();
  });

  it('should return null when no media exists for the specified mType', () => {
    const task = createMockTask({
      interaction: createPartialInteraction({
        media: {
          someOtherId: {
            mType: 'someOtherType',
            mediaResourceId: 'someOtherId',
          },
        },
      }),
    });
    expect(findHoldTimestamp(task, 'mainCall')).toBeNull();
  });

  it('should return null when media exists but has no holdTimestamp', () => {
    const task = createMockTask({
      interaction: createPartialInteraction({
        media: {
          mainCallId: {
            mType: 'mainCall',
            mediaResourceId: 'mainCallId',
            isHold: true,
            // No holdTimestamp
          },
        },
      }),
    });
    expect(findHoldTimestamp(task, 'mainCall')).toBeNull();
  });

  it('should return holdTimestamp for mainCall when it exists', () => {
    const holdTimestamp = 1638360000000;
    const task = createMockTask({
      interaction: createPartialInteraction({
        media: {
          mainCallId: {
            mType: 'mainCall',
            mediaResourceId: 'mainCallId',
            isHold: true,
            holdTimestamp: holdTimestamp,
          },
        },
      }),
    });
    expect(findHoldTimestamp(task, 'mainCall')).toBe(holdTimestamp);
  });

  it('should return holdTimestamp for consult when it exists', () => {
    const consultHoldTimestamp = 1638360500000;
    const task = createMockTask({
      interaction: createPartialInteraction({
        media: {
          consultId: {
            mType: 'consult',
            mediaResourceId: 'consultId',
            isHold: true,
            holdTimestamp: consultHoldTimestamp,
          },
        },
      }),
    });
    expect(findHoldTimestamp(task, 'consult')).toBe(consultHoldTimestamp);
  });

  it('should return correct holdTimestamp when multiple media types exist', () => {
    const mainHoldTimestamp = 1638360000000;
    const consultHoldTimestamp = 1638360500000;
    const task = createMockTask({
      interaction: createPartialInteraction({
        media: {
          mainCallId: {
            mType: 'mainCall',
            mediaResourceId: 'mainCallId',
            isHold: true,
            holdTimestamp: mainHoldTimestamp,
          },
          consultId: {
            mType: 'consult',
            mediaResourceId: 'consultId',
            isHold: true,
            holdTimestamp: consultHoldTimestamp,
          },
        },
      }),
    });

    expect(findHoldTimestamp(task, 'mainCall')).toBe(mainHoldTimestamp);
    expect(findHoldTimestamp(task, 'consult')).toBe(consultHoldTimestamp);
  });

  it('should handle holdTimestamp as zero', () => {
    const task = createMockTask({
      interaction: createPartialInteraction({
        media: {
          mainCallId: {
            mType: 'mainCall',
            mediaResourceId: 'mainCallId',
            isHold: false,
            holdTimestamp: 0,
          },
        },
      }),
    });
    expect(findHoldTimestamp(task, 'mainCall')).toBe(0);
  });

  it('should return null when mediaResourceId does not match', () => {
    const task = createMockTask({
      interaction: createPartialInteraction({
        media: {
          mainCallId: {
            mType: 'mainCall',
            mediaResourceId: 'mainCallId',
            isHold: true,
            holdTimestamp: 1638360000000,
          },
        },
      }),
    });
    // Request consult but only mainCall exists
    expect(findHoldTimestamp(task, 'consult')).toBeNull();
  });
});
