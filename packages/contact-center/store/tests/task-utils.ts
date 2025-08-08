import {isIncomingTask} from '../src/task-utils';
import {mockTask} from '../../test-fixtures/src/fixtures';
import {ITask} from '../src/store.types';

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
              agent1: {
                hasJoined: false,
              },
            },
          },
        };

        const result = isIncomingTask(testTask);
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
      expect(isIncomingTask(testTask)).toBe(true);

      // Test with undefined agentId
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: undefined as unknown as string,
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: {agent1: {hasJoined: false}},
        },
      };
      expect(isIncomingTask(testTask)).toBe(true);
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
          participants: {agent1: {hasJoined: false}},
        },
      };
      expect(isIncomingTask(testTask)).toBe(false);

      // Test agent has already joined
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: 'agent1',
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: {agent1: {hasJoined: true}},
        },
      };
      expect(isIncomingTask(testTask)).toBe(false);
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
            participants: {agent1: {hasJoined: false}},
          },
        };
        expect(isIncomingTask(testTask)).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle invalid task data gracefully', () => {
      // Null/undefined tasks
      expect(isIncomingTask(null as unknown as ITask)).toBe(false);
      expect(isIncomingTask(undefined as unknown as ITask)).toBe(false);
      expect(isIncomingTask({} as ITask)).toBe(false);
      expect(isIncomingTask({data: null} as unknown as ITask)).toBe(false);

      // Missing interaction
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: 'agent1',
        interaction: undefined,
      } as unknown as ITask['data'];
      expect(isIncomingTask(testTask)).toBe(false);
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
      expect(isIncomingTask(testTask)).toBe(true);

      // Agent not found in participants
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: 'agent1',
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: {agent2: {hasJoined: true}},
        },
      };
      expect(isIncomingTask(testTask)).toBe(true);

      // Multiple agents with different join states - only current agent matters
      testTask.data = {
        ...testTask.data,
        wrapUpRequired: false,
        agentId: 'agent1',
        interaction: {
          ...testTask.data.interaction,
          state: 'new',
          participants: {
            agent1: {hasJoined: false}, // Current agent hasn't joined
            agent2: {hasJoined: true}, // Other agent has joined
          },
        },
      };
      expect(isIncomingTask(testTask)).toBe(true);
    });
  });
});
