import {
  isIncomingTask,
  getConferenceParticipants,
  getConferenceParticipantDropRoster,
  findHoldTimestamp,
} from '../src/task-utils';
import {mockTask} from '../../test-fixtures/src/fixtures';
import {createEnabledMainTaskUIControls} from '../../test-fixtures/src/taskUIControlsFixtures';
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

  it('should resolve mainCall media by mType when interactionId points to consult leg', () => {
    const mainCallMediaId = '4da1b819-f461-444b-b817-0c983f235cde';
    const consultMediaId = '8d18e6c0-4377-4431-8b9d-ed22cdde94cb';

    const task = createMockTask({
      interactionId: consultMediaId,
      interaction: createPartialInteraction({
        state: 'conference',
        media: {
          [mainCallMediaId]: {
            mType: 'mainCall',
            mediaResourceId: mainCallMediaId,
            participants: ['agent1', 'agent2', 'customer1'],
          },
          [consultMediaId]: {
            mType: 'consult',
            mediaResourceId: consultMediaId,
            participants: ['agent1', 'agent3'],
          },
        },
        participants: {
          agent1: {id: 'agent1', pType: 'Agent', name: 'Agent One', hasLeft: false},
          agent2: {id: 'agent2', pType: 'Agent', name: 'Agent Two', hasLeft: false},
          agent3: {id: 'agent3', pType: 'Agent', name: 'Agent Three', hasLeft: false},
          customer1: {id: 'customer1', pType: 'Customer', name: 'Customer One', hasLeft: false},
        },
      }),
    });

    const result = getConferenceParticipants(task, currentAgentId);

    expect(result).toEqual([
      {
        id: 'agent2',
        pType: 'Agent',
        name: 'Agent Two',
      },
    ]);
  });

  it('should return empty array for consult-only secondary agents not in conference', () => {
    const task = createMockTask({
      interactionId: 'child-interaction',
      interaction: createPartialInteraction({
        state: 'consult',
        interactionId: 'child-interaction',
        callProcessingDetails: {
          relationshipType: 'consult',
          parentInteractionId: 'parent-interaction',
        },
        media: {
          main: {
            mType: 'mainCall',
            mediaResourceId: 'main',
            participants: ['agent3', 'agent1', 'agent2'],
          },
        },
        participants: {
          agent1: {id: 'agent1', pType: 'Agent', name: 'Agent One', hasLeft: false},
          agent2: {id: 'agent2', pType: 'Agent', name: 'Agent Two', hasLeft: false},
          agent3: {id: 'agent3', pType: 'Agent', name: 'Agent Three', hasLeft: false},
        },
      }),
    });

    expect(getConferenceParticipants(task, 'agent3')).toEqual([]);
  });

  it('should return empty array for agent-name consulted agent during conference nested consult', () => {
    const mainCallMediaId = 'b3629886-1f6b-4de9-b037-8f09667abac8';
    const consultMediaId = '10bd2a1e-fc74-4c2c-af61-4f82de268cf7';

    const task = createMockTask({
      interactionId: consultMediaId,
      interaction: createPartialInteraction({
        state: 'conference',
        interactionId: mainCallMediaId,
        media: {
          [mainCallMediaId]: {
            mType: 'mainCall',
            mediaResourceId: mainCallMediaId,
            participants: ['customer1', 'agent1', 'agent2', 'dn1'],
          },
          [consultMediaId]: {
            mType: 'consult',
            mediaResourceId: consultMediaId,
            participants: ['agent3', 'agent1'],
          },
        },
        participants: {
          agent1: {id: 'agent1', pType: 'Agent', name: 'Agent One', hasLeft: false, isConsulted: false},
          agent2: {id: 'agent2', pType: 'Agent', name: 'Agent Two', hasLeft: false, isConsulted: false},
          agent3: {id: 'agent3', pType: 'Agent', name: 'Agent Three', hasLeft: false, isConsulted: true},
          customer1: {id: 'customer1', pType: 'Customer', name: 'Customer', hasLeft: false},
          dn1: {id: 'dn1', pType: 'DN', name: 'DN', hasLeft: false},
        },
      }),
    });

    expect(getConferenceParticipants(task, 'agent3')).toEqual([]);
    expect(getConferenceParticipants(task, 'agent1')).toEqual([
      {id: 'agent2', pType: 'Agent', name: 'Agent Two'},
      {id: 'dn1', pType: 'DN', name: 'DN'},
    ]);
  });
});

describe('getConferenceParticipantDropRoster', () => {
  const currentAgentId = 'agent1';

  const activeParticipant = (id: string, pType: string, name?: string) => ({
    id,
    pType,
    type: pType,
    name,
    hasJoined: true,
    hasLeft: false,
    isInPredial: false,
  });

  const createDropRosterTask = ({
    owner = currentAgentId,
    direction = 'inbound',
    state = 'conference',
    wrapUpRequired = false,
    consultHold,
  }: {
    owner?: string;
    direction?: string;
    state?: string;
    wrapUpRequired?: boolean;
    consultHold?: boolean;
  } = {}): ITask => {
    const controls = createEnabledMainTaskUIControls({exitConference: {isVisible: true, isEnabled: true}});
    const media = {
      main: {
        mediaResourceId: 'main',
        mediaType: 'telephony',
        mediaMgr: 'aqm',
        mType: 'mainCall',
        isHold: false,
        holdTimestamp: null,
        participants: ['agent1', 'agent2', 'epdn1', 'supervisor1', 'customer1', 'vva1', 'unsupported1'],
      },
      ...(consultHold === undefined
        ? {}
        : {
            consult: {
              mediaResourceId: 'consult',
              mediaType: 'telephony',
              mediaMgr: 'aqm',
              mType: 'consult',
              isHold: consultHold,
              holdTimestamp: consultHold ? Date.now() : null,
              participants: ['agent1', 'consult-agent'],
            },
          }),
    };

    if (consultHold !== undefined) {
      controls.consult.endConsult = {isVisible: true, isEnabled: true};
    }

    return {
      ...mockTask,
      uiControls: controls,
      data: {
        ...mockTask.data,
        interactionId: 'main',
        wrapUpRequired,
        isConferenceInProgress: true,
        interaction: createPartialInteraction({
          ...mockTask.data.interaction,
          interactionId: 'main',
          mediaType: 'telephony',
          state,
          owner,
          contactDirection: {type: direction},
          callAssociatedDetails: {ani: '+15550000001', dnis: '+15550000002'},
          callProcessingDetails: {
            ...mockTask.data.interaction.callProcessingDetails,
            ani: '+15550000001',
            dnis: '+15550000002',
          },
          media,
          participants: {
            agent1: activeParticipant('agent1', 'Agent', 'Current Agent'),
            agent2: activeParticipant('agent2', 'Agent', 'Agent Two'),
            epdn1: {...activeParticipant('epdn1', 'EP_DN', 'EP-DN'), dn: '+15550000003'},
            supervisor1: activeParticipant('supervisor1', 'Supervisor', 'Supervisor One'),
            customer1: activeParticipant('customer1', 'Customer', 'Customer'),
            vva1: activeParticipant('vva1', 'VVA', 'Virtual Agent'),
            unsupported1: activeParticipant('unsupported1', 'Queue', 'Queue'),
            'consult-agent': activeParticipant('consult-agent', 'Agent', 'Consult Agent'),
          },
        }),
      },
    } as ITask;
  };

  it('derives Customer, Agent, EP-DN, and read-only Supervisor rows from the main leg', () => {
    const task = createDropRosterTask();
    const roster = getConferenceParticipantDropRoster(task, currentAgentId);

    expect(roster).toEqual({
      customer: {
        participantType: 'Customer',
        displayName: '+15550000001',
        dropTargetId: '+15550000001',
        isPrimary: false,
        isReadOnly: false,
        isDropDisabled: false,
        requiresConfirmation: true,
      },
      participants: [
        {
          participantType: 'Agent',
          displayName: 'Agent Two',
          dropTargetId: 'agent2',
          isPrimary: false,
          isReadOnly: false,
          isDropDisabled: false,
          requiresConfirmation: false,
        },
        {
          participantType: 'EP-DN',
          displayName: '+15550000003',
          dropTargetId: 'epdn1',
          isPrimary: false,
          isReadOnly: false,
          isDropDisabled: false,
          requiresConfirmation: false,
        },
        {
          participantType: 'Supervisor',
          displayName: 'Supervisor One',
          dropTargetId: 'supervisor1',
          isPrimary: false,
          isReadOnly: true,
          isDropDisabled: false,
          requiresConfirmation: false,
        },
      ],
      isDropDisabled: false,
    });
    expect(roster?.participants).not.toEqual(expect.arrayContaining([expect.objectContaining({dropTargetId: 'vva1'})]));
    expect(roster?.participants).not.toEqual(
      expect.arrayContaining([expect.objectContaining({dropTargetId: 'consult-agent'})])
    );
    expect(getConferenceParticipants(task, currentAgentId)).toHaveLength(3);
  });

  it('uses outbound DNIS for the synthetic Customer target', () => {
    const roster = getConferenceParticipantDropRoster(createDropRosterTask({direction: 'outbound'}), currentAgentId);

    expect(roster?.customer?.dropTargetId).toBe('+15550000002');
  });

  it('omits departed, not-yet-joined, and customer rows without a valid direction number', () => {
    const task = createDropRosterTask();
    task.data.interaction.participants.agent2.hasLeft = true;
    task.data.interaction.participants.epdn1.hasJoined = false;
    task.data.interaction.callAssociatedDetails.ani = '';
    task.data.interaction.callProcessingDetails.ani = '';

    expect(getConferenceParticipantDropRoster(task, currentAgentId)).toEqual({
      customer: null,
      participants: [
        {
          participantType: 'Supervisor',
          displayName: 'Supervisor One',
          dropTargetId: 'supervisor1',
          isPrimary: false,
          isReadOnly: true,
          isDropDisabled: false,
          requiresConfirmation: false,
        },
      ],
      isDropDisabled: false,
    });
  });

  it('makes every row read-only for a non-owner and marks the owner as Primary', () => {
    const roster = getConferenceParticipantDropRoster(createDropRosterTask({owner: 'agent2'}), currentAgentId);

    expect(roster?.customer?.isReadOnly).toBe(true);
    expect(roster?.participants.every((target) => target.isReadOnly)).toBe(true);
    expect(roster?.participants.find((target) => target.dropTargetId === 'agent2')?.isPrimary).toBe(true);
  });

  it('disables Drop only while an active consult is not held', () => {
    expect(
      getConferenceParticipantDropRoster(createDropRosterTask({consultHold: false}), currentAgentId)?.isDropDisabled
    ).toBe(true);
    expect(
      getConferenceParticipantDropRoster(createDropRosterTask({consultHold: true}), currentAgentId)?.isDropDisabled
    ).toBe(false);
  });

  it('keeps Drop disabled while active consult controls precede consult media hydration', () => {
    const task = createDropRosterTask({consultHold: false});
    delete task.data.interaction.media.consult;

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.isDropDisabled).toBe(true);
  });

  it('returns null outside an eligible telephony main call', () => {
    const task = createDropRosterTask();
    task.data.interaction.mediaType = 'chat';
    expect(getConferenceParticipantDropRoster(task, currentAgentId)).toBeNull();
  });

  it('keeps a valid multiparty roster through post-call and wrap-up signal downgrades', () => {
    const task = createDropRosterTask({state: 'post_call', wrapUpRequired: true});
    task.data.isConferenceInProgress = false;
    task.data.isConferencing = false;
    task.data.interaction.callProcessingDetails.isConferencing = 'false';
    task.uiControls.main.exitConference = {isVisible: false, isEnabled: false};
    task.uiControls.main.wrapup = {isVisible: true, isEnabled: true};
    task.data.interaction.media.main.participants = ['agent1', 'agent2', 'epdn1'];

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({dropTargetId: 'agent2'}),
      expect.objectContaining({dropTargetId: 'epdn1'}),
    ]);
  });

  it('uses main-leg membership for a Customer-plus-Agent multiparty call', () => {
    const task = createDropRosterTask({state: 'connected'});
    task.data.isConferenceInProgress = false;
    task.data.isConferencing = false;
    task.data.interaction.callProcessingDetails.isConferencing = 'false';
    task.uiControls.main.exitConference = {isVisible: false, isEnabled: false};

    expect(getConferenceParticipantDropRoster(task, currentAgentId)).not.toBeNull();
  });

  it('keeps Participants after Customer leaves and conference signals downgrade', () => {
    const task = createDropRosterTask({state: 'connected'});
    task.data.isConferenceInProgress = false;
    task.data.isConferencing = false;
    task.data.interaction.callProcessingDetails.isConferencing = 'false';
    task.uiControls.main.exitConference = {isVisible: false, isEnabled: false};
    task.data.interaction.participants.customer1.hasLeft = true;

    const roster = getConferenceParticipantDropRoster(task, currentAgentId);

    expect(roster?.customer).toBeNull();
    expect(roster?.participants).toEqual([
      expect.objectContaining({participantType: 'Agent', dropTargetId: 'agent2'}),
      expect.objectContaining({participantType: 'EP-DN', dropTargetId: 'epdn1'}),
      expect.objectContaining({participantType: 'Supervisor', dropTargetId: 'supervisor1'}),
    ]);
  });

  it('does not treat an initial one-agent/one-customer call as a conference roster', () => {
    const task = createDropRosterTask({state: 'connected'});
    task.data.isConferenceInProgress = false;
    task.data.isConferencing = false;
    task.data.interaction.callProcessingDetails.isConferencing = 'false';
    task.uiControls.main.exitConference = {isVisible: false, isEnabled: false};
    task.data.interaction.media.main.participants = ['agent1', 'customer1'];

    expect(getConferenceParticipantDropRoster(task, currentAgentId)).toBeNull();
  });

  it('keeps the roster when Customer leaves one other Agent', () => {
    const task = createDropRosterTask({state: 'post_call', wrapUpRequired: true});
    task.data.isConferenceInProgress = false;
    task.data.isConferencing = false;
    task.data.interaction.callProcessingDetails.isConferencing = 'false';
    task.uiControls.main.exitConference = {isVisible: false, isEnabled: false};
    task.uiControls.main.wrapup = {isVisible: true, isEnabled: true};
    task.data.interaction.media.main.participants = ['agent1', 'agent2'];
    task.data.interaction.participants.customer1.hasLeft = true;

    expect(getConferenceParticipantDropRoster(task, currentAgentId)).toEqual({
      customer: null,
      participants: [expect.objectContaining({participantType: 'Agent', dropTargetId: 'agent2'})],
      isDropDisabled: false,
    });
  });

  it('returns to the 1-to-1 UI when the final Agent leaves while Customer remains', () => {
    const task = createDropRosterTask({state: 'connected'});
    task.data.interaction.media.main.participants = ['agent1', 'agent2', 'customer1'];
    task.data.interaction.participants.agent2.hasLeft = true;

    expect(getConferenceParticipantDropRoster(task, currentAgentId)).toBeNull();
  });

  it('shows an Entry Point number while ringing, replaces it with the answering agent, and enables it after merge', () => {
    const task = createDropRosterTask({state: 'consulting', consultHold: false});
    task.data.consultMediaResourceId = 'consult';
    task.data.destinationType = 'entryPoint';
    task.data.interaction.media.main.participants = ['agent1', 'customer1'];
    task.data.interaction.media.consult.participants = ['agent1', 'entry-point-route'];
    task.data.interaction.participants['entry-point-route'] = {
      ...activeParticipant('+15550000009', 'entry-point-id', 'EP-DN'),
      type: 'EpDn',
      dn: '+15550000009',
      hasJoined: false,
    };

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({
        participantType: 'EP-DN',
        displayName: '+15550000009',
        dropTargetId: '+15550000009',
        isReadOnly: false,
        isDropDisabled: true,
      }),
    ]);

    task.data.interaction.participants['answering-agent'] = activeParticipant(
      'answering-agent',
      'Agent',
      'Support Agent'
    );
    task.data.interaction.media.consult.participants.push('answering-agent');
    task.data.interaction.callProcessingDetails.consultDestinationAgentJoined = 'true';
    task.data.interaction.callProcessingDetails.consultDestinationAgentName = 'Support Agent';

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({
        participantType: 'Agent',
        displayName: 'Support Agent',
        dropTargetId: 'answering-agent',
        isDropDisabled: true,
      }),
    ]);

    task.data.interaction.media.main.participants.push('answering-agent');
    task.data.interaction.state = 'conference';
    task.data.interaction.media.consult.isHold = true;

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({
        participantType: 'Agent',
        displayName: 'Support Agent',
        dropTargetId: 'answering-agent',
        isDropDisabled: false,
      }),
    ]);
  });

  it('keeps the consulting conference Agent and identifies the Entry Point answering Agent', () => {
    const task = createDropRosterTask({state: 'consulting', consultHold: false});
    task.data.consultMediaResourceId = 'consult';
    task.data.destinationType = 'entryPoint';
    task.data.interaction.media.main.participants = ['agent1', 'agent2', 'customer1'];
    task.data.interaction.media.consult.participants = ['agent2', 'entry-point-route'];
    task.data.interaction.participants['entry-point-route'] = {
      ...activeParticipant('+15550000009', 'entry-point-id', 'EP-DN'),
      type: 'EpDn',
      dn: '+15550000009',
      hasJoined: false,
    };

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({displayName: 'Agent Two', dropTargetId: 'agent2'}),
      expect.objectContaining({displayName: '+15550000009', isDropDisabled: true}),
    ]);

    task.data.interaction.participants['answering-agent'] = {
      ...activeParticipant('answering-agent', 'Agent', 'Support Agent'),
      isConsulted: true,
    };
    task.data.interaction.media.consult.participants.push('answering-agent');
    task.data.interaction.callProcessingDetails.consultDestinationAgentJoined = 'true';
    task.data.interaction.callProcessingDetails.consultDestinationAgentName = 'Support Agent';

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({displayName: 'Agent Two', dropTargetId: 'agent2'}),
      expect.objectContaining({
        participantType: 'Agent',
        displayName: 'Support Agent',
        dropTargetId: 'answering-agent',
        isDropDisabled: true,
      }),
    ]);
  });

  it('uses the latest task snapshot when the Entry Point consult leg has not reached task.data yet', () => {
    const task = createDropRosterTask({state: 'consulting', consultHold: false});
    task.data.interaction.media.main.participants = ['agent1', 'customer1'];
    delete task.data.interaction.media.consult;

    const snapshotTaskData = {
      ...task.data,
      consultMediaResourceId: 'snapshot-consult',
      destinationType: 'entryPoint',
      interaction: {
        ...task.data.interaction,
        media: {
          ...task.data.interaction.media,
          'snapshot-consult': {
            mediaResourceId: 'snapshot-consult',
            mediaType: 'telephony',
            mediaMgr: 'aqm',
            mType: 'consult',
            isHold: false,
            holdTimestamp: null,
            participants: ['agent1', 'snapshot-entry-point'],
          },
        },
        participants: {
          ...task.data.interaction.participants,
          'snapshot-entry-point': {
            ...activeParticipant('+15550000010', 'entry-point-id', 'EP-DN'),
            type: 'EpDn',
            hasJoined: false,
          },
        },
      },
    };

    (
      task as ITask & {
        state: {context: {taskData: ITask['data']}};
      }
    ).state = {context: {taskData: snapshotTaskData}};

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({
        participantType: 'EP-DN',
        displayName: '+15550000010',
        dropTargetId: '+15550000010',
        isDropDisabled: true,
      }),
    ]);
  });

  it('prefers a newer configured consult leg from the state snapshot over retained observable media', () => {
    const task = createDropRosterTask({state: 'consulting', consultHold: false});
    task.data.consultMediaResourceId = 'consult';
    task.data.destinationType = 'entryPoint';
    task.data.interaction.media.main.participants = ['agent1', 'customer1'];
    task.data.interaction.media.consult.participants = ['agent1', 'old-entry-point'];
    (task.data.interaction.media.consult as unknown as Record<string, unknown>).lastUpdated = 1000;
    task.data.interaction.participants['old-entry-point'] = {
      ...activeParticipant('+15550000011', 'entry-point-id', 'EP-DN'),
      type: 'EpDn',
      hasJoined: false,
    };

    const snapshotTaskData = {
      ...task.data,
      consultMediaResourceId: 'new-consult',
      interaction: {
        ...task.data.interaction,
        media: {
          ...task.data.interaction.media,
          'new-consult': {
            mediaResourceId: 'new-consult',
            mediaType: 'telephony',
            mediaMgr: 'aqm',
            mType: 'consult',
            isHold: false,
            holdTimestamp: null,
            lastUpdated: 2000,
            participants: ['agent1', 'new-entry-point'],
          },
        },
        participants: {
          ...task.data.interaction.participants,
          'new-entry-point': {
            ...activeParticipant('+15550000012', 'entry-point-id', 'EP-DN'),
            type: 'EpDn',
            hasJoined: false,
          },
        },
      },
    };

    (
      task as ITask & {
        state: {context: {taskData: ITask['data']}};
      }
    ).state = {context: {taskData: snapshotTaskData}};

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({
        displayName: '+15550000012',
        dropTargetId: '+15550000012',
      }),
    ]);
  });

  it('keeps a newer observable consult leg when the state snapshot is stale', () => {
    const task = createDropRosterTask({state: 'consulting', consultHold: false});
    task.data.consultMediaResourceId = 'consult';
    task.data.destinationType = 'entryPoint';
    task.data.interaction.media.main.participants = ['agent1', 'customer1'];
    task.data.interaction.media.consult.participants = ['agent1', 'current-entry-point'];
    (task.data.interaction.media.consult as unknown as Record<string, unknown>).lastUpdated = 2000;
    task.data.interaction.participants['current-entry-point'] = {
      ...activeParticipant('+15550000013', 'entry-point-id', 'EP-DN'),
      type: 'EpDn',
      hasJoined: false,
    };

    const snapshotTaskData = {
      ...task.data,
      consultMediaResourceId: 'old-consult',
      interaction: {
        ...task.data.interaction,
        media: {
          ...task.data.interaction.media,
          'old-consult': {
            mediaResourceId: 'old-consult',
            mediaType: 'telephony',
            mediaMgr: 'aqm',
            mType: 'consult',
            isHold: false,
            holdTimestamp: null,
            participants: ['agent1', 'old-entry-point'],
          },
        },
        participants: {
          ...task.data.interaction.participants,
          'old-entry-point': {
            ...activeParticipant('+15550000014', 'entry-point-id', 'EP-DN'),
            type: 'EpDn',
            hasJoined: false,
          },
        },
      },
    };

    (
      task as ITask & {
        state: {context: {taskData: ITask['data']}};
      }
    ).state = {context: {taskData: snapshotTaskData}};

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({
        displayName: '+15550000013',
        dropTargetId: '+15550000013',
      }),
    ]);
  });

  it('preserves observable data for the same leg unless the snapshot is demonstrably newer', () => {
    const task = createDropRosterTask({state: 'consulting', consultHold: false});
    task.data.consultMediaResourceId = 'consult';
    task.data.destinationType = 'entryPoint';
    task.data.interaction.media.main.participants = ['agent1', 'customer1'];
    task.data.interaction.media.consult.participants = ['agent1', 'observable-entry-point'];
    task.data.interaction.participants['observable-entry-point'] = {
      ...activeParticipant('+15550000015', 'entry-point-id', 'EP-DN'),
      type: 'EpDn',
      hasJoined: false,
    };

    const snapshotTaskData = {
      ...task.data,
      interaction: {
        ...task.data.interaction,
        media: {
          ...task.data.interaction.media,
          consult: {
            ...task.data.interaction.media.consult,
            participants: ['agent1', 'snapshot-entry-point'],
          },
        },
        participants: {
          ...task.data.interaction.participants,
          'snapshot-entry-point': {
            ...activeParticipant('+15550000016', 'entry-point-id', 'EP-DN'),
            type: 'EpDn',
            hasJoined: false,
          },
        },
      },
    };

    (
      task as ITask & {
        state: {context: {taskData: ITask['data']}};
      }
    ).state = {context: {taskData: snapshotTaskData}};

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({
        displayName: '+15550000015',
        dropTargetId: '+15550000015',
      }),
    ]);

    (task.data.interaction.media.consult as unknown as Record<string, unknown>).lastUpdated = 1000;
    (snapshotTaskData.interaction.media.consult as unknown as Record<string, unknown>).lastUpdated = 2000;

    expect(getConferenceParticipantDropRoster(task, currentAgentId)?.participants).toEqual([
      expect.objectContaining({
        displayName: '+15550000016',
        dropTargetId: '+15550000016',
      }),
    ]);
  });

  it('does not revive a stale pending EP-DN consult leg', () => {
    const task = createDropRosterTask({state: 'connected', consultHold: false});
    task.data.consultMediaResourceId = 'consult';
    task.data.interaction.media.main.participants = ['agent1', 'customer1'];
    task.data.interaction.media.consult.participants = ['agent1', 'pending-epdn'];
    task.data.interaction.participants['pending-epdn'] = {
      ...activeParticipant('pending-epdn', 'EP_DN', 'EP-DN'),
      dn: '+15550000009',
      hasJoined: false,
    };
    task.uiControls.consult = createEnabledMainTaskUIControls().consult;

    expect(getConferenceParticipantDropRoster(task, currentAgentId)).toBeNull();
  });

  it('returns null when the viewing agent has departed or the task is terminated', () => {
    const departedTask = createDropRosterTask();
    departedTask.data.interaction.participants.agent1.hasLeft = true;
    expect(getConferenceParticipantDropRoster(departedTask, currentAgentId)).toBeNull();

    const terminatedTask = createDropRosterTask({state: 'terminated'});
    terminatedTask.data.interaction.isTerminated = true;
    expect(getConferenceParticipantDropRoster(terminatedTask, currentAgentId)).toBeNull();
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
