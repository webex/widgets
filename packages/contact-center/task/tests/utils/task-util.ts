import {mockTask} from '@webex/test-fixtures';
import {findHoldTimestamp} from '../../src/Utils/task-util';
import {getConferenceParticipants} from '@webex/cc-store';
import {ITask, TaskData, Interaction} from '@webex/contact-center';

const createMockTask = (data: Partial<TaskData>): ITask => {
  return {
    ...mockTask,
    data: {
      ...mockTask.data,
      ...data,
    } as TaskData,
  };
};

const createPartialInteraction = (interaction: unknown): TaskData['interaction'] => {
  return interaction as TaskData['interaction'];
};

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
