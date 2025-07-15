import {
  extractTaskListItemData,
  isTaskSelectable,
  isCurrentTaskSelected,
  isTaskListEmpty,
  getTasksArray,
  createTaskSelectHandler,
  TaskListItemData,
} from '../../../../src/components/task/TaskList/task-list.utils';
import {MEDIA_CHANNEL} from '../../../../src/components/task/task.types';
import {ITask} from '@webex/cc-store';

describe('task-list.utils', () => {
  // Helper function to create mock tasks
  const createMockTask = (overrides = {}): ITask =>
    ({
      data: {
        interactionId: 'test-interaction-123',
        wrapUpRequired: false,
        interaction: {
          callAssociatedDetails: {
            ani: '1234567890',
            customerName: 'John Doe',
            virtualTeamName: 'Support Team',
            ronaTimeout: '30',
          },
          createdTimestamp: 1641234567890,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: 'voice',
          state: 'active',
        },
        ...overrides,
      },
      ...overrides,
    }) as ITask;

  describe('extractTaskListItemData', () => {
    describe('Active tasks (non-incoming)', () => {
      it('should extract correct data for active telephony task on browser', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                customerName: 'John Doe',
                virtualTeamName: 'Support Team',
                ronaTimeout: '45',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
              state: 'active',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractTaskListItemData(mockTask, true);

        expect(result).toEqual({
          ani: '1234567890',
          customerName: 'John Doe',
          virtualTeamName: 'Support Team',
          ronaTimeout: null, // Should be null for non-incoming tasks
          taskState: 'active',
          startTimeStamp: 1641234567890,
          isIncomingTask: false,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: 'voice',
          isTelephony: true,
          isSocial: false,
          acceptText: undefined,
          declineText: undefined,
          title: '1234567890', // ANI for telephony
          disableAccept: false,
          displayState: 'active', // Should show state for non-incoming
        });
      });

      it('should extract correct data for active social media task', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                customerName: 'Alice Johnson',
                virtualTeamName: 'Social Team',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.SOCIAL,
              mediaChannel: 'facebook',
              state: 'connected',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractTaskListItemData(mockTask, true);

        expect(result.title).toBe('Alice Johnson'); // Customer name for social
        expect(result.isSocial).toBe(true);
        expect(result.isTelephony).toBe(false);
        expect(result.displayState).toBe('connected');
        expect(result.isIncomingTask).toBe(false);
        expect(result.ronaTimeout).toBeNull();
      });
    });

    describe('Incoming tasks (new/consult)', () => {
      it('should extract correct data for incoming telephony task on browser', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '9876543210',
                customerName: 'Jane Smith',
                virtualTeamName: 'Sales Team',
                ronaTimeout: '60',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
              state: 'new',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractTaskListItemData(mockTask, true);

        expect(result).toEqual({
          ani: '9876543210',
          customerName: 'Jane Smith',
          virtualTeamName: 'Sales Team',
          ronaTimeout: 60, // Should show RONA timeout for incoming tasks
          taskState: 'new',
          startTimeStamp: 1641234567890,
          isIncomingTask: true,
          mediaType: MEDIA_CHANNEL.TELEPHONY,
          mediaChannel: 'voice',
          isTelephony: true,
          isSocial: false,
          acceptText: 'Accept',
          declineText: 'Decline',
          title: '9876543210',
          disableAccept: false,
          displayState: '', // Should be empty for incoming tasks
        });
      });

      it('should extract correct data for incoming telephony task on non-browser', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '5555555555',
                customerName: 'Mobile User',
                virtualTeamName: 'Mobile Support',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
              state: 'new',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractTaskListItemData(mockTask, false);

        expect(result.acceptText).toBe('Ringing...');
        expect(result.declineText).toBeUndefined();
        expect(result.disableAccept).toBe(true);
        expect(result.isIncomingTask).toBe(true);
        expect(result.displayState).toBe('');
      });

      it('should extract correct data for consult task', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '7777777777',
                customerName: 'Consult Customer',
                virtualTeamName: 'Expert Team',
                ronaTimeout: '90',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
              state: 'consult',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractTaskListItemData(mockTask, true);

        expect(result.isIncomingTask).toBe(true);
        expect(result.taskState).toBe('consult');
        expect(result.displayState).toBe('');
        expect(result.ronaTimeout).toBe(90);
        expect(result.acceptText).toBe('Accept');
      });

      it('should handle incoming task with wrap up required', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '8888888888',
                customerName: 'Wrap Up Customer',
                virtualTeamName: 'Wrap Up Team',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
              state: 'new',
            },
            wrapUpRequired: true,
          },
        });

        const result = extractTaskListItemData(mockTask, true);

        expect(result.acceptText).toBeUndefined();
        expect(result.declineText).toBeUndefined();
        expect(result.isIncomingTask).toBe(true);
      });
    });

    describe('Different media types', () => {
      it('should handle chat tasks', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: 'chat-user-123',
                customerName: 'Chat Customer',
                virtualTeamName: 'Chat Team',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.CHAT,
              mediaChannel: 'webchat',
              state: 'active',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractTaskListItemData(mockTask, true);

        expect(result.mediaType).toBe(MEDIA_CHANNEL.CHAT);
        expect(result.isTelephony).toBe(false);
        expect(result.isSocial).toBe(false);
        expect(result.title).toBe('chat-user-123'); // ANI for non-social
        expect(result.displayState).toBe('active');
      });

      it('should handle email tasks', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: 'user@email.com',
                customerName: 'Email Customer',
                virtualTeamName: 'Email Team',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.EMAIL,
              mediaChannel: 'email',
              state: 'active',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractTaskListItemData(mockTask, true);

        expect(result.mediaType).toBe(MEDIA_CHANNEL.EMAIL);
        expect(result.title).toBe('user@email.com');
        expect(result.isTelephony).toBe(false);
        expect(result.isSocial).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should handle missing call association details', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: undefined,
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
              state: 'active',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractTaskListItemData(mockTask, true);

        expect(result.ani).toBeUndefined();
        expect(result.customerName).toBeUndefined();
        expect(result.virtualTeamName).toBeUndefined();
        expect(result.ronaTimeout).toBeNull();
        expect(result.title).toBeUndefined();
      });

      it('should handle missing ronaTimeout', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                customerName: 'Test User',
                virtualTeamName: 'Test Team',
                // ronaTimeout missing
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
              state: 'new',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractTaskListItemData(mockTask, true);

        expect(result.ronaTimeout).toBeNull();
      });

      it('should handle invalid ronaTimeout', () => {
        const mockTask = createMockTask({
          data: {
            interaction: {
              callAssociatedDetails: {
                ani: '1234567890',
                customerName: 'Test User',
                virtualTeamName: 'Test Team',
                ronaTimeout: 'invalid',
              },
              createdTimestamp: 1641234567890,
              mediaType: MEDIA_CHANNEL.TELEPHONY,
              mediaChannel: 'voice',
              state: 'new',
            },
            wrapUpRequired: false,
          },
        });

        const result = extractTaskListItemData(mockTask, true);

        expect(result.ronaTimeout).toBeNaN();
      });
    });
  });

  describe('isTaskSelectable', () => {
    const mockCurrentTask = createMockTask({
      data: {interactionId: 'current-task-123'},
    });

    it('should return false for the same task', () => {
      const taskData = {isIncomingTask: false} as TaskListItemData;
      const result = isTaskSelectable(mockCurrentTask, mockCurrentTask, taskData);
      expect(result).toBe(false);
    });

    it('should return true for different non-incoming task', () => {
      const differentTask = createMockTask({
        data: {interactionId: 'different-task-456'},
      });
      const taskData = {isIncomingTask: false} as TaskListItemData;

      const result = isTaskSelectable(differentTask, mockCurrentTask, taskData);
      expect(result).toBe(true);
    });

    it('should return false for incoming task without wrap up', () => {
      const incomingTask = createMockTask({
        data: {
          interactionId: 'incoming-task-789',
          wrapUpRequired: false,
        },
      });
      const taskData = {isIncomingTask: true} as TaskListItemData;

      const result = isTaskSelectable(incomingTask, mockCurrentTask, taskData);
      expect(result).toBe(false);
    });

    it('should return true for incoming task with wrap up required', () => {
      const incomingTask = createMockTask({
        data: {
          interactionId: 'incoming-task-789',
          wrapUpRequired: true,
        },
      });
      const taskData = {isIncomingTask: true} as TaskListItemData;

      const result = isTaskSelectable(incomingTask, mockCurrentTask, taskData);
      expect(result).toBe(true);
    });

    it('should return true when no current task is selected', () => {
      const someTask = createMockTask({
        data: {interactionId: 'some-task-456'},
      });
      const taskData = {isIncomingTask: false} as TaskListItemData;

      const result = isTaskSelectable(someTask, null, taskData);
      expect(result).toBe(true);
    });
  });

  describe('isCurrentTaskSelected', () => {
    it('should return true when task is currently selected', () => {
      const task = createMockTask({
        data: {interactionId: 'test-123'},
      });
      const currentTask = createMockTask({
        data: {interactionId: 'test-123'},
      });

      const result = isCurrentTaskSelected(task, currentTask);
      expect(result).toBe(true);
    });

    it('should return false when different task is selected', () => {
      const task = createMockTask({
        data: {interactionId: 'test-123'},
      });
      const currentTask = createMockTask({
        data: {interactionId: 'different-456'},
      });

      const result = isCurrentTaskSelected(task, currentTask);
      expect(result).toBe(false);
    });

    it('should return false when no task is selected', () => {
      const task = createMockTask({
        data: {interactionId: 'test-123'},
      });

      const result = isCurrentTaskSelected(task, null);
      expect(result).toBe(false);
    });
  });

  describe('isTaskListEmpty', () => {
    it('should return true for null task list', () => {
      expect(isTaskListEmpty(null)).toBe(true);
    });

    it('should return true for undefined task list', () => {
      expect(isTaskListEmpty(undefined)).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(isTaskListEmpty({})).toBe(true);
    });

    it('should return false for task list with tasks', () => {
      const taskList = {
        'task-1': createMockTask({data: {interactionId: 'task-1'}}),
        'task-2': createMockTask({data: {interactionId: 'task-2'}}),
      };
      expect(isTaskListEmpty(taskList)).toBe(false);
    });
  });

  describe('getTasksArray', () => {
    it('should convert task list object to array', () => {
      const task1 = createMockTask({data: {interactionId: 'task-1'}});
      const task2 = createMockTask({data: {interactionId: 'task-2'}});
      const taskList = {
        'task-1': task1,
        'task-2': task2,
      };

      const result = getTasksArray(taskList);
      expect(result).toHaveLength(2);
      expect(result).toContain(task1);
      expect(result).toContain(task2);
    });

    it('should return empty array for empty task list', () => {
      const result = getTasksArray({});
      expect(result).toEqual([]);
    });

    // ✅ Add these tests for 100% coverage if using Option 2
    it('should return empty array for null task list', () => {
      const result = getTasksArray(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined task list', () => {
      const result = getTasksArray(undefined);
      expect(result).toEqual([]);
    });
  });

  describe('createTaskSelectHandler', () => {
    const mockOnTaskSelect = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call onTaskSelect for selectable task', () => {
      const task = createMockTask({
        data: {
          interactionId: 'task-1',
          interaction: {state: 'active'},
        },
      });
      const currentTask = createMockTask({
        data: {interactionId: 'task-2'},
      });

      const handler = createTaskSelectHandler(task, currentTask, mockOnTaskSelect);
      handler();

      expect(mockOnTaskSelect).toHaveBeenCalledWith(task);
    });

    it('should not call onTaskSelect for non-selectable task', () => {
      const task = createMockTask({
        data: {
          interactionId: 'task-1',
          interaction: {state: 'new'},
          wrapUpRequired: false,
        },
      });
      const currentTask = createMockTask({
        data: {interactionId: 'task-2'},
      });

      const handler = createTaskSelectHandler(task, currentTask, mockOnTaskSelect);
      handler();

      expect(mockOnTaskSelect).not.toHaveBeenCalled();
    });

    it('should not call onTaskSelect for same task', () => {
      const task = createMockTask({
        data: {
          interactionId: 'task-1',
          // ✅ Add the missing interaction object with required properties
          interaction: {
            state: 'active',
            createdTimestamp: 1641234567890,
            mediaType: MEDIA_CHANNEL.TELEPHONY,
            mediaChannel: 'voice',
            callAssociatedDetails: {
              ani: '1234567890',
              customerName: 'Test User',
              virtualTeamName: 'Test Team',
            },
          },
        },
      });

      const handler = createTaskSelectHandler(task, task, mockOnTaskSelect);
      handler();

      expect(mockOnTaskSelect).not.toHaveBeenCalled();
    });
  });

  describe('Button text combinations', () => {
    const testCases = [
      {
        description: 'browser telephony incoming without wrap up',
        isBrowser: true,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        state: 'new',
        wrapUpRequired: false,
        expectedAcceptText: 'Accept',
        expectedDeclineText: 'Decline',
        expectedDisableAccept: false,
      },
      {
        description: 'non-browser telephony incoming without wrap up',
        isBrowser: false,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        state: 'new',
        wrapUpRequired: false,
        expectedAcceptText: 'Ringing...',
        expectedDeclineText: undefined,
        expectedDisableAccept: true,
      },
      {
        description: 'browser social incoming without wrap up',
        isBrowser: true,
        mediaType: MEDIA_CHANNEL.SOCIAL,
        state: 'new',
        wrapUpRequired: false,
        expectedAcceptText: 'Accept',
        expectedDeclineText: undefined,
        expectedDisableAccept: false,
      },
      {
        description: 'active task (non-incoming)',
        isBrowser: true,
        mediaType: MEDIA_CHANNEL.TELEPHONY,
        state: 'active',
        wrapUpRequired: false,
        expectedAcceptText: undefined,
        expectedDeclineText: undefined,
        expectedDisableAccept: false,
      },
    ];

    testCases.forEach(
      ({
        description,
        isBrowser,
        mediaType,
        state,
        wrapUpRequired,
        expectedAcceptText,
        expectedDeclineText,
        expectedDisableAccept,
      }) => {
        it(`should handle ${description}`, () => {
          const mockTask = createMockTask({
            data: {
              interaction: {
                callAssociatedDetails: {
                  ani: '1234567890',
                  customerName: 'Test User',
                  virtualTeamName: 'Test Team',
                },
                createdTimestamp: 1641234567890,
                mediaType,
                mediaChannel: 'test-channel',
                state,
              },
              wrapUpRequired,
            },
          });

          const result = extractTaskListItemData(mockTask, isBrowser);

          expect(result.acceptText).toBe(expectedAcceptText);
          expect(result.declineText).toBe(expectedDeclineText);
          expect(result.disableAccept).toBe(expectedDisableAccept);
        });
      }
    );
  });
});
